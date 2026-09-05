import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventCoupons } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { normalizeCouponCode, validateCouponFields } from "@/lib/coupon";
import { and, asc, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };


/** 取得活動的折扣碼列表 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const list = await db
    .select()
    .from(eventCoupons)
    .where(eq(eventCoupons.eventId, eventId))
    .orderBy(asc(eventCoupons.id));

  return NextResponse.json({ coupons: list });
}

/** 新增折扣碼 */
export async function POST(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? normalizeCouponCode(body.code) : "";
  if (!code) {
    return NextResponse.json({ error: "請提供折扣碼 code" }, { status: 400 });
  }
  if (code.length > 50) {
    return NextResponse.json({ error: "折扣碼長度不可超過 50 字" }, { status: 400 });
  }
  const discountType = body.discountType;
  const value = Number(body.value);
  const usageLimit = body.usageLimit == null ? null : Number(body.usageLimit);
  const fieldError = validateCouponFields(discountType, value, usageLimit);
  if (fieldError) {
    return NextResponse.json({ error: fieldError }, { status: 400 });
  }

  const existing = await db
    .select({ id: eventCoupons.id })
    .from(eventCoupons)
    .where(and(eq(eventCoupons.eventId, eventId), eq(eventCoupons.code, code)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "折扣碼重複" }, { status: 409 });
  }

  try {
    const [coupon] = await db
      .insert(eventCoupons)
      .values({ eventId, code, discountType, value, usageLimit })
      .returning();

    if (!coupon) {
      return NextResponse.json({ error: "新增失敗" }, { status: 500 });
    }

    return NextResponse.json({ coupon });
  } catch (e) {
    // unique constraint 併發兜底（pre-check 之後仍可能撞上）
    if ((e as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "折扣碼重複" }, { status: 409 });
    }
    throw e;
  }
}
