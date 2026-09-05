import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventPurchaseItemGroups,
  eventGroupExclusions,
  eventPriceTiers,
  eventPurchaseItemPrices,
  eventRegistrationPurchaseItems,
  eventCoupons,
  teamMembers,
} from "@/db/schema";
import { sendRegistrationSuccessEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import { getTeamRole, requireAuth, requireTeamMember } from "@/lib/api-auth";
import { isTeamAdmin } from "@/lib/team-roles";
import { applyRegistrationVisibility } from "@/lib/registration-visibility";
import { validateGroupSelection, resolveUnitPrices } from "@/lib/registration-pricing";
import { normalizeCouponCode, computeCouponDiscount } from "@/lib/coupon";
import { eq, desc, count, or, like, and, inArray, asc, sql, isNull, isNotNull, lt } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/** 折扣碼名額於 transaction 內被搶完時擲出，於外層轉為 409 */
class CouponExhaustedError extends Error {
  constructor() {
    super("COUPON_EXHAUSTED");
  }
}

function generateRegistrationKey(): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  const generateRandomKey = customAlphabet(alphabet, 12);
  return generateRandomKey()
}

/**
 * 取得活動的報名列表（需為該團隊成員）
 */
export async function GET(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // 驗票人員看得到名單與報到狀態，但看不到金額
  const canSeeMoney = isTeamAdmin(await getTeamRole(event.teamId, session.userId));

  // 取得搜尋參數
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const rawPageSize = parseInt(searchParams.get("pageSize") || "50", 10) || 50;
  const pageSize = Math.min(200, Math.max(1, rawPageSize));

  // Filter params
  const paymentStatus = searchParams.get("paymentStatus") || "all";
  const hiddenFilter = searchParams.get("hiddenFilter") || "all";
  const checkInFilter = searchParams.get("checkInFilter") || "all";
  const couponFilter = searchParams.get("couponFilter") || "all";

  // 建立查詢條件
  const whereConditions = [eq(eventRegistrations.eventId, eventId)];

  // 如果有搜尋條件，加入搜尋
  if (search) {
    whereConditions.push(
      or(
        like(eventRegistrations.contactName, `%${search}%`),
        like(eventRegistrations.contactEmail, `%${search}%`),
        like(eventRegistrations.contactPhone, `%${search}%`)
      )!
    );
  }

  // Payment status filter
  if (paymentStatus !== "all") {
    whereConditions.push(
      eq(eventRegistrations.paymentStatus, paymentStatus as "pending" | "reported" | "confirmed" | "rejected")
    );
  }

  // Hidden filter
  if (hiddenFilter === "non_hidden") {
    whereConditions.push(eq(eventRegistrations.hidden, false));
  } else if (hiddenFilter === "hidden") {
    whereConditions.push(eq(eventRegistrations.hidden, true));
  }

  // Coupon filter
  if (couponFilter === "used") {
    whereConditions.push(isNotNull(eventRegistrations.couponCode));
  } else if (couponFilter === "not_used") {
    whereConditions.push(isNull(eventRegistrations.couponCode));
  }

  // COUNT query for pagination total (before checkInFilter which is applied in JS)
  const [{ total }] = await db
    .select({ total: count() })
    .from(eventRegistrations)
    .where(and(...whereConditions));

  const registrations = await db
    .select({
      id: eventRegistrations.id,
      registrationKey: eventRegistrations.registrationKey,
      eventId: eventRegistrations.eventId,
      purchaseItemId: eventRegistrations.purchaseItemId,
      contactName: eventRegistrations.contactName,
      contactPhone: eventRegistrations.contactPhone,
      contactEmail: eventRegistrations.contactEmail,
      paymentMethod: eventRegistrations.paymentMethod,
      source: eventRegistrations.source,
      totalAmount: eventRegistrations.totalAmount,
      couponCode: eventRegistrations.couponCode,
      discountAmount: eventRegistrations.discountAmount,
      paymentStatus: eventRegistrations.paymentStatus,
      paymentScreenshotUrl: eventRegistrations.paymentScreenshotUrl,
      paymentNote: eventRegistrations.paymentNote,
      hidden: eventRegistrations.hidden,
      createdAt: eventRegistrations.createdAt,
      updatedAt: eventRegistrations.updatedAt,
    })
    .from(eventRegistrations)
    .where(and(...whereConditions))
    .orderBy(desc(eventRegistrations.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // 取得每個報名的參加者數量與已入場數量（單一查詢）
  const registrationIds = registrations.map((r) => r.id);
  const attendeeCounts =
    registrationIds.length > 0
      ? await db
          .select({
            registrationId: eventAttendees.registrationId,
            total: count(),
            checkedIn: sql<number>`cast(count(case when ${eventAttendees.checkedIn} then 1 end) as int)`,
          })
          .from(eventAttendees)
          .where(inArray(eventAttendees.registrationId, registrationIds))
          .groupBy(eventAttendees.registrationId)
      : [];

  const countMap = new Map(attendeeCounts.map((a) => [a.registrationId, Number(a.total)]));
  const checkedInMap = new Map(attendeeCounts.map((a) => [a.registrationId, Number(a.checkedIn)]));

  // 組合結果
  let result = registrations.map((reg) => ({
    ...reg,
    attendeeCount: countMap.get(reg.id) || 0,
    checkedInCount: checkedInMap.get(reg.id) || 0,
  }));

  // Apply checkInFilter in JavaScript (attendee counts already available)
  if (checkInFilter === "none") {
    result = result.filter((r) => r.attendeeCount > 0 && r.checkedInCount === 0);
  } else if (checkInFilter === "partial") {
    result = result.filter((r) => r.checkedInCount > 0 && r.checkedInCount < r.attendeeCount);
  } else if (checkInFilter === "all_entered") {
    result = result.filter((r) => r.attendeeCount > 0 && r.checkedInCount === r.attendeeCount);
  }

  return NextResponse.json({
    registrations: result.map((reg) => applyRegistrationVisibility(reg, canSeeMoney)),
    pagination: { total: Number(total), page, pageSize },
  });
}

/**
 * 建立活動報名（不需登入）
 * 用於公開報名頁面
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const eventId = Number((await params).eventId);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
    }

    // 檢查活動是否存在且已發布
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "找不到活動" }, { status: 404 });
    }

    if (event.status !== "published") {
      return NextResponse.json(
        { error: "此活動尚未開放報名" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // 驗證必填欄位
    const purchaseItemId =
      body.purchaseItemId != null ? Number(body.purchaseItemId) : null;
    const purchaseItemIds = Array.isArray(body.purchaseItemIds)
      ? body.purchaseItemIds.map((id: any) => Number(id)).filter((id: number) => Number.isInteger(id))
      : [];
    const contactName =
      typeof body.contactName === "string" ? body.contactName.trim() : "";
    const contactPhone =
      typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
    const contactEmail =
      typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const paymentMethod =
      typeof body.paymentMethod === "string" ? body.paymentMethod : null;
    const totalAmount = Number(body.totalAmount);
    const couponCode =
      typeof body.couponCode === "string" ? normalizeCouponCode(body.couponCode) : "";
    const attendees =
      Array.isArray(body.attendees) && body.attendees.length > 0
        ? body.attendees
        : [];

    // 活動有票種群組 → 走群組模型（等同多選寫入 join table，並依群組規則驗證）
    const groups = await db
      .select()
      .from(eventPurchaseItemGroups)
      .where(eq(eventPurchaseItemGroups.eventId, eventId));
    const useGroups = groups.length > 0;
    // 群組活動一律走多選路徑
    const effectiveMultiple = useGroups || event.allowMultiplePurchase;
    // 伺服器權威計算金額的模式（群組或 autoCalc）；折扣碼僅在此模式生效
    const serverAuthoritative = useGroups || !!event.autoCalcAmount;

    // Check if event allows multiple purchase
    const hasPurchaseItems = effectiveMultiple
      ? purchaseItemIds.length > 0
      : purchaseItemId != null;

    if (
      !contactName ||
      !contactPhone ||
      !contactEmail ||
      !Number.isInteger(totalAmount) ||
      // 權威模式下伺服器會重算金額，允許 0（100% 折抵）；手填模式維持必須為正
      (serverAuthoritative ? totalAmount < 0 : totalAmount <= 0) ||
      attendees.length === 0 ||
      !hasPurchaseItems
    ) {
      return NextResponse.json(
        {
          error:
            "請提供有效的聯絡人資訊（姓名、電話、信箱）、購買項目、總金額與至少一位參加者",
        },
        { status: 400 }
      );
    }

    // 驗證 email 格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "請提供有效的 email" }, { status: 400 });
    }

    // 驗證購買項目是否存在
    if (effectiveMultiple) {
      // Multiple selection: validate all purchase items
      if (purchaseItemIds.length === 0) {
        return NextResponse.json(
          { error: "請至少選擇一個購買項目" },
          { status: 400 }
        );
      }
      const purchaseItems = await db
        .select()
        .from(eventPurchaseItems)
        .where(
          and(
            eq(eventPurchaseItems.eventId, eventId),
            eq(eventPurchaseItems.hidden, false)
          )
        );
      const validItemIds = purchaseItems.map((item) => item.id);
      const invalidIds = purchaseItemIds.filter((id: number) => !validItemIds.includes(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "無效的購買項目" },
          { status: 400 }
        );
      }

      // 群組活動：依群組規則做後端校驗（與現場報名共用 validateGroupSelection）
      if (useGroups) {
        const exclusions = await db
          .select({
            groupAId: eventGroupExclusions.groupAId,
            groupBId: eventGroupExclusions.groupBId,
          })
          .from(eventGroupExclusions)
          .where(eq(eventGroupExclusions.eventId, eventId));
        const groupError = validateGroupSelection(
          groups,
          purchaseItems,
          purchaseItemIds,
          exclusions
        );
        if (groupError) {
          return NextResponse.json({ error: groupError }, { status: 400 });
        }
      }
    } else {
      // Single selection: validate single purchase item
      if (purchaseItemId != null) {
        const [purchaseItem] = await db
          .select()
          .from(eventPurchaseItems)
          .where(eq(eventPurchaseItems.id, purchaseItemId))
          .limit(1);

        if (
          !purchaseItem ||
          purchaseItem.eventId !== eventId ||
          purchaseItem.hidden
        ) {
          return NextResponse.json(
            { error: "無效的購買項目" },
            { status: 400 }
          );
        }
      }
    }

    // 驗證參加者資料
    const validAttendees = attendees.filter(
      (a: any) =>
        typeof a.name === "string" &&
        a.name.trim() &&
        typeof a.role === "string" &&
        ["Leader", "Follower", "Not sure"].includes(a.role)
    );

    if (validAttendees.length === 0) {
      return NextResponse.json(
        { error: "請提供至少一位有效的參加者（姓名與角色）" },
        { status: 400 }
      );
    }

    // 解析當下時段價（伺服器時間），快照每個選取項目的單價並重算權威總額
    const selectedIds = effectiveMultiple
      ? purchaseItemIds
      : purchaseItemId != null
        ? [purchaseItemId]
        : [];

    const [selectedItems, tiers, priceRows] = await Promise.all([
      selectedIds.length > 0
        ? db
            .select({ id: eventPurchaseItems.id, amount: eventPurchaseItems.amount })
            .from(eventPurchaseItems)
            .where(inArray(eventPurchaseItems.id, selectedIds))
        : Promise.resolve([] as { id: number; amount: number }[]),
      db
        .select()
        .from(eventPriceTiers)
        .where(eq(eventPriceTiers.eventId, eventId))
        .orderBy(asc(eventPriceTiers.sortOrder)),
      selectedIds.length > 0
        ? db
            .select()
            .from(eventPurchaseItemPrices)
            .where(inArray(eventPurchaseItemPrices.purchaseItemId, selectedIds))
        : Promise.resolve([] as { purchaseItemId: number; tierId: number; amount: number }[]),
    ]);

    const { activeTier, unitPriceById } = resolveUnitPrices(
      selectedItems,
      tiers,
      priceRows,
      new Date()
    );

    // autoCalc（或群組活動）時以伺服器解析價為準（Σ單價 × 參加者數），避免顯示價/收費價不一致或被竄改
    const computedTotal =
      selectedIds.reduce(
        (sum: number, id: number) => sum + (unitPriceById.get(id) ?? 0),
        0
      ) * validAttendees.length;

    // 折扣碼：僅權威模式生效，伺服器重新驗證並計算折抵（client 僅預覽）
    let coupon: typeof eventCoupons.$inferSelect | null = null;
    let discountAmount = 0;
    if (couponCode) {
      if (!serverAuthoritative) {
        return NextResponse.json(
          { error: "此活動不支援折扣碼", code: "COUPON_NOT_SUPPORTED" },
          { status: 400 }
        );
      }
      const [found] = await db
        .select()
        .from(eventCoupons)
        .where(
          and(eq(eventCoupons.eventId, eventId), eq(eventCoupons.code, couponCode))
        )
        .limit(1);
      if (!found) {
        return NextResponse.json(
          { error: "折扣碼無效", code: "COUPON_INVALID" },
          { status: 400 }
        );
      }
      // 友善預檢；實際名額由 transaction 內的原子更新把關
      if (found.usageLimit != null && found.usedCount >= found.usageLimit) {
        return NextResponse.json(
          { error: "此折扣碼已額滿，無法使用", code: "COUPON_EXHAUSTED" },
          { status: 409 }
        );
      }
      coupon = found;
      discountAmount = computeCouponDiscount(computedTotal, found);
    }

    const finalTotalAmount = serverAuthoritative
      ? computedTotal - discountAmount
      : totalAmount;

    // 權威模式擋折扣前即非正的金額（保留舊行為）；折扣後允許 0（免費報名）
    if (
      !Number.isInteger(finalTotalAmount) ||
      finalTotalAmount < 0 ||
      (serverAuthoritative && computedTotal <= 0)
    ) {
      return NextResponse.json({ error: "總金額計算錯誤" }, { status: 400 });
    }

    const registrationKey = generateRegistrationKey();

    // 建立報名記錄（在 transaction 中確保原子性）
    const registration = await db.transaction(async (tx) => {
      // 原子搶折扣碼名額：條件更新保證併發時只有 usageLimit 筆成功。
      // 註：取消/拒絕報名不回補 usedCount（v1 限制）。
      if (coupon) {
        const claimed = await tx
          .update(eventCoupons)
          .set({
            usedCount: sql`${eventCoupons.usedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(eventCoupons.id, coupon.id),
              or(
                isNull(eventCoupons.usageLimit),
                lt(eventCoupons.usedCount, eventCoupons.usageLimit)
              )
            )
          )
          .returning({ id: eventCoupons.id });
        if (claimed.length === 0) {
          throw new CouponExhaustedError();
        }
      }

      // 建立報名記錄
      const [reg] = await tx
        .insert(eventRegistrations)
        .values({
          registrationKey,
          eventId,
          purchaseItemId: effectiveMultiple ? null : (Number.isInteger(purchaseItemId) ? purchaseItemId : null),
          contactName,
          contactPhone,
          contactEmail,
          paymentMethod,
          totalAmount: finalTotalAmount,
          couponId: coupon?.id ?? null,
          couponCode: coupon?.code ?? null,
          discountAmount,
          paymentStatus: "pending",
        })
        .returning();

      if (!reg) {
        throw new Error("建立報名失敗");
      }

      // 建立購買項目關聯。單選也要寫入，才會留下收費當下的單價快照（unitAmount）；
      // 否則之後統計只能退回項目定價（fallback 段），早鳥報名會被算成現場價。
      if (selectedIds.length > 0) {
        const registrationPurchaseItemValues = selectedIds.map((itemId: number) => ({
          registrationId: reg.id,
          purchaseItemId: itemId,
          quantity: 1, // Default quantity, can be extended later
          unitAmount: unitPriceById.get(itemId) ?? null,
          tierName: activeTier?.name ?? null,
        }));
        await tx.insert(eventRegistrationPurchaseItems).values(registrationPurchaseItemValues);
      }

      // 建立參加者記錄
      const attendeeValues = validAttendees.map((a: any) => ({
        registrationId: reg.id,
        name: a.name.trim(),
        role: a.role,
      }));
      await tx.insert(eventAttendees).values(attendeeValues);

      return reg;
    });

    // Send confirmation email to contact (non-blocking, outside transaction)
    sendRegistrationSuccessEmail(
      contactEmail,
      registration.registrationKey,
      event.title ?? undefined
    ).catch((err) => console.error("Registration success email error:", err));

    return NextResponse.json({
      registration: {
        id: registration.id,
        registrationKey: registration.registrationKey,
        eventId: registration.eventId,
        contactName: registration.contactName,
        contactPhone: registration.contactPhone,
        contactEmail: registration.contactEmail,
        paymentMethod: registration.paymentMethod,
        totalAmount: registration.totalAmount,
        couponCode: registration.couponCode,
        discountAmount: registration.discountAmount,
        paymentStatus: registration.paymentStatus,
        createdAt: registration.createdAt,
      },
    });
  } catch (e) {
    if (e instanceof CouponExhaustedError) {
      return NextResponse.json(
        { error: "此折扣碼已額滿，無法使用", code: "COUPON_EXHAUSTED" },
        { status: 409 }
      );
    }
    console.error("Registration creation error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
