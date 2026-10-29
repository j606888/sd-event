import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventCoupons } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { normalizeCouponCode, validateCouponFields } from "@/lib/coupon";
import { apiError } from "@/lib/api-error";
import { and, eq, ne } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; couponId: string }> };


/** 更新折扣碼（code / 類型 / 數值 / 使用上限）。修改只影響之後的報名，既有報名為快照。 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { eventId: eventIdStr, couponId: couponIdStr } = await params;
  const eventId = Number(eventIdStr);
  const couponId = Number(couponIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(couponId)) {
    return apiError("eventApiErrors.invalidId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const [coupon] = await db
    .select()
    .from(eventCoupons)
    .where(and(eq(eventCoupons.id, couponId), eq(eventCoupons.eventId, eventId)))
    .limit(1);
  if (!coupon) {
    return apiError("eventApiErrors.coupons.notFound", 404);
  }

  const body = await request.json().catch(() => ({}));

  const code =
    typeof body.code === "string" ? normalizeCouponCode(body.code) : coupon.code;
  if (!code) {
    return apiError("eventApiErrors.coupons.codeEmpty", 400);
  }
  if (code.length > 50) {
    return apiError("eventApiErrors.coupons.codeTooLong", 400);
  }
  const discountType =
    "discountType" in body ? body.discountType : coupon.discountType;
  const value = "value" in body ? Number(body.value) : coupon.value;
  const usageLimit =
    "usageLimit" in body
      ? body.usageLimit == null
        ? null
        : Number(body.usageLimit)
      : coupon.usageLimit;

  const fieldError = validateCouponFields(discountType, value, usageLimit);
  if (fieldError) {
    return apiError(`eventApiErrors.coupons.fields.${fieldError}`, 400);
  }
  if (usageLimit != null && usageLimit < coupon.usedCount) {
    return apiError("eventApiErrors.coupons.usageLimitBelowUsed", 400);
  }

  if (code !== coupon.code) {
    const dup = await db
      .select({ id: eventCoupons.id })
      .from(eventCoupons)
      .where(
        and(
          eq(eventCoupons.eventId, eventId),
          eq(eventCoupons.code, code),
          ne(eventCoupons.id, couponId)
        )
      )
      .limit(1);
    if (dup.length > 0) {
      return apiError("eventApiErrors.coupons.duplicate", 409);
    }
  }

  try {
    const [updated] = await db
      .update(eventCoupons)
      .set({ code, discountType, value, usageLimit, updatedAt: new Date() })
      .where(and(eq(eventCoupons.id, couponId), eq(eventCoupons.eventId, eventId)))
      .returning();

    if (!updated) {
      return apiError("eventApiErrors.coupons.notFound", 404);
    }

    return NextResponse.json({ coupon: updated });
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") {
      return apiError("eventApiErrors.coupons.duplicate", 409);
    }
    throw e;
  }
}

/** 刪除折扣碼（硬刪；既有報名以 couponCode/discountAmount 快照保留顯示資訊） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { eventId: eventIdStr, couponId: couponIdStr } = await params;
  const eventId = Number(eventIdStr);
  const couponId = Number(couponIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(couponId)) {
    return apiError("eventApiErrors.invalidId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const [deleted] = await db
    .delete(eventCoupons)
    .where(and(eq(eventCoupons.id, couponId), eq(eventCoupons.eventId, eventId)))
    .returning();

  if (!deleted) {
    return apiError("eventApiErrors.coupons.notFound", 404);
  }

  return NextResponse.json({ ok: true });
}
