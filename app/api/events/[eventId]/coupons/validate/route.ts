import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventCoupons, eventPurchaseItemGroups } from "@/db/schema";
import { normalizeCouponCode } from "@/lib/coupon";
import { apiError, apiMessage } from "@/lib/api-error";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/**
 * 公開驗證折扣碼（報名表單預覽用，不需登入；信任層級同公開報名 POST）。
 * 一律回 200，以 discriminated union 表達結果；實際折扣仍由報名 POST 權威重算。
 */
export async function POST(request: Request, { params }: Params) {
  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? normalizeCouponCode(body.code) : "";
  if (!code) {
    return NextResponse.json({
      valid: false,
      reason: "not_found",
      error: await apiMessage("eventApiErrors.coupons.enterCode"),
    });
  }

  // 折扣碼僅在伺服器能權威計算金額的活動生效（群組模式或 autoCalcAmount）
  const groups = await db
    .select({ id: eventPurchaseItemGroups.id })
    .from(eventPurchaseItemGroups)
    .where(eq(eventPurchaseItemGroups.eventId, eventId))
    .limit(1);
  const supported =
    event.status === "published" && (groups.length > 0 || !!event.autoCalcAmount);
  if (!supported) {
    return NextResponse.json({
      valid: false,
      reason: "not_supported",
      error: await apiMessage("eventApiErrors.coupons.notSupported"),
    });
  }

  const [coupon] = await db
    .select()
    .from(eventCoupons)
    .where(and(eq(eventCoupons.eventId, eventId), eq(eventCoupons.code, code)))
    .limit(1);
  if (!coupon) {
    return NextResponse.json({
      valid: false,
      reason: "not_found",
      error: await apiMessage("eventApiErrors.coupons.codeNotFound"),
    });
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return NextResponse.json({
      valid: false,
      reason: "exhausted",
      error: await apiMessage("eventApiErrors.coupons.exhausted"),
    });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
    },
  });
}
