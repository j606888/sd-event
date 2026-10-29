import { NextResponse, after } from "next/server";
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
  users,
} from "@/db/schema";
import { sendNewRegistrationNotificationEmail, sendRegistrationSuccessEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import { getTeamRole, requireAuth, requireTeamMember } from "@/lib/api-auth";
import { isTeamAdmin } from "@/lib/team-roles";
import { applyRegistrationVisibility } from "@/lib/registration-visibility";
import { validateGroupSelection, resolveUnitPrices } from "@/lib/registration-pricing";
import { computeItemsTotal, findSeatCountMismatch } from "@/lib/seat-count";
import { normalizeFlagLabel, findFlaggedShortfall } from "@/lib/attendee-flag";
import { normalizeCouponCode, computeCouponDiscount } from "@/lib/coupon";
import { parsePurchaseItemIdParam, registrationHasPurchaseItem } from "@/lib/registration-item-filter";
import { registrationMatchesSearch } from "@/lib/registration-search";
import { parseCheckInFilterParam, registrationMatchesCheckIn } from "@/lib/registration-checkin-filter";
import { apiError, apiMessage } from "@/lib/api-error";
import { asLocale } from "@/lib/locale";
import { getLocale } from "next-intl/server";
import { eq, desc, count, or, and, inArray, asc, sql, isNull, isNotNull, lt } from "drizzle-orm";

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
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
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
  const checkInFilter = parseCheckInFilterParam(searchParams.get("checkInFilter"));
  const couponFilter = searchParams.get("couponFilter") || "all";
  const purchaseItemId = parsePurchaseItemIdParam(searchParams.get("purchaseItemId"));

  // 建立查詢條件
  const whereConditions = [eq(eventRegistrations.eventId, eventId)];

  // 如果有搜尋條件，加入搜尋
  if (search) {
    whereConditions.push(registrationMatchesSearch(search));
  }

  // Payment status filter
  if (paymentStatus !== "all") {
    whereConditions.push(
      eq(eventRegistrations.paymentStatus, paymentStatus as "pending" | "reported" | "confirmed" | "rejected" | "refunded")
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

  // 報名項目篩選（例：誰報了 Full Pass）
  if (purchaseItemId != null) {
    whereConditions.push(registrationHasPurchaseItem(purchaseItemId));
  }

  // 入場狀態（SQL 端過濾，分頁筆數才會正確）
  const checkInCondition = registrationMatchesCheckIn(checkInFilter);
  if (checkInCondition) {
    whereConditions.push(checkInCondition);
  }

  // COUNT query for pagination total
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

  // 參加者明細：名單列要直接顯示姓名／角色，並能不進明細就按入場
  const registrationIds = registrations.map((r) => r.id);
  const [attendeeRows, itemRows, purchaseItemOptions] = await Promise.all([
    registrationIds.length > 0
      ? db
          .select({
            id: eventAttendees.id,
            registrationId: eventAttendees.registrationId,
            name: eventAttendees.name,
            role: eventAttendees.role,
            checkedIn: eventAttendees.checkedIn,
            checkedInAt: eventAttendees.checkedInAt,
          })
          .from(eventAttendees)
          .where(inArray(eventAttendees.registrationId, registrationIds))
          .orderBy(asc(eventAttendees.id))
      : [],
    registrationIds.length > 0
      ? db
          .select({
            registrationId: eventRegistrationPurchaseItems.registrationId,
            purchaseItemId: eventRegistrationPurchaseItems.purchaseItemId,
            quantity: eventRegistrationPurchaseItems.quantity,
          })
          .from(eventRegistrationPurchaseItems)
          .where(inArray(eventRegistrationPurchaseItems.registrationId, registrationIds))
          .orderBy(asc(eventRegistrationPurchaseItems.id))
      : [],
    // 「報名項目」篩選的選項（只給名稱，不含金額，驗票人員也能用）
    db
      .select({ id: eventPurchaseItems.id, name: eventPurchaseItems.name })
      .from(eventPurchaseItems)
      .where(eq(eventPurchaseItems.eventId, eventId))
      .orderBy(asc(eventPurchaseItems.sortOrder), asc(eventPurchaseItems.id)),
  ]);

  const attendeesByRegistration = new Map<number, (typeof attendeeRows)[number][]>();
  for (const row of attendeeRows) {
    const list = attendeesByRegistration.get(row.registrationId);
    if (list) list.push(row);
    else attendeesByRegistration.set(row.registrationId, [row]);
  }

  const itemNameById = new Map(purchaseItemOptions.map((i) => [i.id, i.name] as const));
  const itemLabel = (purchaseItemId: number, quantity: number) => {
    const name = itemNameById.get(purchaseItemId);
    if (!name) return null;
    return quantity > 1 ? `${name} × ${quantity}` : name;
  };
  const itemLabelsByRegistration = new Map<number, string[]>();
  for (const row of itemRows) {
    const label = itemLabel(row.purchaseItemId, row.quantity);
    if (!label) continue;
    const list = itemLabelsByRegistration.get(row.registrationId);
    if (list) list.push(label);
    else itemLabelsByRegistration.set(row.registrationId, [label]);
  }

  // 組合結果
  const itemSeparator = await apiMessage("eventApiErrors.registrationList.itemSeparator");
  const result = registrations.map((reg) => {
    const attendees = (attendeesByRegistration.get(reg.id) ?? []).map(
      ({ id, name, role, checkedIn, checkedInAt }) => ({ id, name, role, checkedIn, checkedInAt })
    );
    // 舊制單選報名沒有 join 列，退回 registration.purchaseItemId
    const labels =
      itemLabelsByRegistration.get(reg.id) ??
      (reg.purchaseItemId != null ? [itemLabel(reg.purchaseItemId, 1)].filter(Boolean) : []);
    return {
      ...reg,
      attendees,
      attendeeCount: attendees.length,
      checkedInCount: attendees.filter((a) => a.checkedIn).length,
      itemSummary: labels.join(itemSeparator),
    };
  });

  return NextResponse.json({
    registrations: result.map((reg) => applyRegistrationVisibility(reg, canSeeMoney)),
    pagination: { total: Number(total), page, pageSize },
    purchaseItemOptions,
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
      return apiError("eventApiErrors.invalidEventId", 400);
    }

    // 檢查活動是否存在且已發布
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return apiError("apiErrors.common.eventNotFound", 404);
    }

    if (event.status !== "published") {
      return apiError("eventApiErrors.registration.notOpen", 403);
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
      return apiError("eventApiErrors.registration.missingFields", 400);
    }

    // 驗證 email 格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return apiError("eventApiErrors.invalidEmail", 400);
    }

    // 驗證購買項目是否存在
    if (effectiveMultiple) {
      // Multiple selection: validate all purchase items
      if (purchaseItemIds.length === 0) {
        return apiError("eventApiErrors.registration.itemRequired", 400);
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
        return apiError("eventApiErrors.invalidPurchaseItem", 400);
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
          return apiError(
            `eventApiErrors.groupSelection.${groupError.code}`,
            400,
            groupError.values
          );
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
          return apiError("eventApiErrors.invalidPurchaseItem", 400);
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
      return apiError("eventApiErrors.invalidAttendees", 400);
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
            .select({
              id: eventPurchaseItems.id,
              name: eventPurchaseItems.name,
              amount: eventPurchaseItems.amount,
              seatCount: eventPurchaseItems.seatCount,
              minFlagged: eventPurchaseItems.minFlagged,
            })
            .from(eventPurchaseItems)
            .where(inArray(eventPurchaseItems.id, selectedIds))
        : Promise.resolve(
            [] as {
              id: number;
              name: string;
              amount: number;
              seatCount: number;
              minFlagged: number;
            }[]
          ),
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

    const { activeTier, unitPriceById, unavailableItem } = resolveUnitPrices(
      selectedItems,
      tiers,
      priceRows,
      new Date()
    );
    // 時段限定票（如早鳥限定）過了販售時段：不論 client 顯示什麼，一律以伺服器時間擋下
    if (unavailableItem) {
      return apiError("eventApiErrors.registration.itemUnavailable", 400, unavailableItem);
    }

    // 套票（如雙人票）要求參加者人數剛好等於票券人數
    const seatMismatch = findSeatCountMismatch(selectedItems, validAttendees.length);
    if (seatMismatch) {
      return apiError("eventApiErrors.registration.seatCountMismatch", 400, seatMismatch);
    }

    // 參加者勾選項目（如參加伸展台比賽）：活動未設 label 時一律存 false
    const flagLabel = normalizeFlagLabel(event.attendeeFlagLabel);
    const flaggedOf = (a: { flagged?: unknown }) => flagLabel != null && a.flagged === true;
    const flagShortfall = findFlaggedShortfall(
      selectedItems,
      validAttendees.filter(flaggedOf).length,
      flagLabel
    );
    if (flagShortfall) {
      return apiError("eventApiErrors.registration.flaggedShortfall", 400, flagShortfall);
    }

    // autoCalc（或群組活動）時以伺服器解析價為準（一般票 單價 × 參加者數、套票 整組價），
    // 避免顯示價/收費價不一致或被竄改
    const computedTotal = computeItemsTotal(
      selectedItems.map((item) => ({
        unitPrice: unitPriceById.get(item.id) ?? 0,
        seatCount: item.seatCount,
      })),
      validAttendees.length
    );

    // 折扣碼：僅權威模式生效，伺服器重新驗證並計算折抵（client 僅預覽）
    let coupon: typeof eventCoupons.$inferSelect | null = null;
    let discountAmount = 0;
    if (couponCode) {
      if (!serverAuthoritative) {
        return NextResponse.json(
          {
            error: await apiMessage("eventApiErrors.coupons.notSupported"),
            code: "COUPON_NOT_SUPPORTED",
          },
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
          { error: await apiMessage("eventApiErrors.coupons.invalid"), code: "COUPON_INVALID" },
          { status: 400 }
        );
      }
      // 友善預檢；實際名額由 transaction 內的原子更新把關
      if (found.usageLimit != null && found.usedCount >= found.usageLimit) {
        return NextResponse.json(
          {
            error: await apiMessage("eventApiErrors.coupons.exhausted"),
            code: "COUPON_EXHAUSTED",
          },
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
      return apiError("eventApiErrors.totalAmountError", 400);
    }

    const registrationKey = generateRegistrationKey();

    // 建立報名記錄（在 transaction 中確保原子性）
    // 報名者當下的介面語言，之後寄給他的信（報名成功、收款確認、退款）都用這個語言
    const locale = await getLocale();
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
          locale,
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
        flagged: flaggedOf(a),
      }));
      await tx.insert(eventAttendees).values(attendeeValues);

      return reg;
    });

    // 回應送出後才寄信（outside transaction）；用 after() 確保 Vercel 不會在寄完前中止
    after(async () => {
      await sendRegistrationSuccessEmail({
        to: contactEmail,
        registrationKey: registration.registrationKey,
        eventTitle: event.title ?? undefined,
        locale,
      }).catch((err) => console.error("Registration success email error:", err));
    });

    // 通知有開啟「新報名通知信」的團隊管理員。只在正式環境寄：本機 .env 也有 RESEND_API_KEY，
    // 否則本機測試會把信寄給真的管理員
    if (process.env.VERCEL_ENV === "production") {
      after(async () => {
        try {
          const recipients = await db
            .select({ email: users.email, locale: users.locale })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.id))
            .where(
              and(
                eq(teamMembers.teamId, event.teamId),
                eq(teamMembers.notifyOnRegistration, true),
                inArray(teamMembers.role, ["owner", "member"])
              )
            );
          await sendNewRegistrationNotificationEmail(
            recipients.map((r) => ({ email: r.email, locale: asLocale(r.locale) })),
            {
              eventId,
              eventTitle: event.title,
              contactName: registration.contactName,
              contactPhone: registration.contactPhone,
              contactEmail: registration.contactEmail,
              attendees: validAttendees.map((a: { name: string; role: string }) => ({ name: a.name.trim(), role: a.role })),
              itemNames: selectedItems.map((item) => item.name),
              tierName: activeTier?.name ?? null,
              paymentMethod: registration.paymentMethod,
              totalAmount: registration.totalAmount,
              couponCode: registration.couponCode,
              discountAmount: registration.discountAmount,
            }
          );
        } catch (err) {
          console.error("New registration notification email error:", err);
        }
      });
    }

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
        { error: await apiMessage("eventApiErrors.coupons.exhausted"), code: "COUPON_EXHAUSTED" },
        { status: 409 }
      );
    }
    console.error("Registration creation error:", e);
    return apiError("apiErrors.common.serverError", 500);
  }
}
