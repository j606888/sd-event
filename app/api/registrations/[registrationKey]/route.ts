import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventRegistrations,
  eventAttendees,
  events,
  eventLocations,
  organizers,
  bankInfos,
  eventPurchaseItems,
  eventPurchaseItemPrices,
  eventPriceTiers,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { createHistoricalPriceResolver } from "@/lib/registration-pricing";

type Params = { params: Promise<{ registrationKey: string }> };

/**
 * 依註冊金鑰取得報名資料（不需登入）
 * 用於查看報名狀態、付款回報頁面
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const registrationKey = (await params).registrationKey?.trim();
    if (!registrationKey) {
      return NextResponse.json({ error: "請提供註冊金鑰" }, { status: 400 });
    }

    // 取得報名記錄
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.registrationKey, registrationKey))
      .limit(1);

    if (!registration) {
      return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
    }

    // 取得活動資料
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, registration.eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "找不到活動" }, { status: 404 });
    }

    // 取得參加者
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.registrationId, registration.id))
      .orderBy(asc(eventAttendees.id));

    // 取得相關資料
    const [location, organizer, bankInfo, purchaseItem, registrationPurchaseItems] = await Promise.all([
      event.locationId
        ? db
            .select()
            .from(eventLocations)
            .where(eq(eventLocations.id, event.locationId))
            .limit(1)
            .then((rows) => rows[0] || null)
        : Promise.resolve(null),
      event.organizerId
        ? db
            .select()
            .from(organizers)
            .where(eq(organizers.id, event.organizerId))
            .limit(1)
            .then((rows) => rows[0] || null)
        : Promise.resolve(null),
      event.bankInfoId
        ? db
            .select()
            .from(bankInfos)
            .where(eq(bankInfos.id, event.bankInfoId))
            .limit(1)
            .then((rows) => rows[0] || null)
        : Promise.resolve(null),
      registration.purchaseItemId
        ? db
            .select()
            .from(eventPurchaseItems)
            .where(eq(eventPurchaseItems.id, registration.purchaseItemId))
            .limit(1)
            .then((rows) => rows[0] || null)
        : Promise.resolve(null),
      // 一律查詢 join table，有列就用；不依賴活動「當下」的 allowMultiplePurchase 設定，
      // 否則報名後才關掉多選的活動會退回項目定價。
      db
        .select({
          id: eventPurchaseItems.id,
          name: eventPurchaseItems.name,
          amount: eventPurchaseItems.amount,
          unitAmount: eventRegistrationPurchaseItems.unitAmount,
        })
        .from(eventRegistrationPurchaseItems)
        .innerJoin(
          eventPurchaseItems,
          eq(eventRegistrationPurchaseItems.purchaseItemId, eventPurchaseItems.id)
        )
        .where(eq(eventRegistrationPurchaseItems.registrationId, registration.id))
        // 金額優先用報名當下的單價快照（含時段價），舊資料退回項目定價
        .then((rows) =>
          rows.map(({ unitAmount, ...row }) => ({
            ...row,
            amount: unitAmount ?? row.amount,
          }))
        ),
    ]);

    // 單選舊資料沒有單價快照，以報名時間回推當時生效的時段價
    let legacyPurchaseItem = purchaseItem;
    if (purchaseItem) {
      const [tiers, priceRows] = await Promise.all([
        db
          .select()
          .from(eventPriceTiers)
          .where(eq(eventPriceTiers.eventId, event.id))
          .orderBy(asc(eventPriceTiers.sortOrder)),
        db
          .select()
          .from(eventPurchaseItemPrices)
          .where(eq(eventPurchaseItemPrices.purchaseItemId, purchaseItem.id)),
      ]);
      const { amount } = createHistoricalPriceResolver(tiers, priceRows)(
        purchaseItem.id,
        purchaseItem.amount,
        registration.createdAt
      );
      legacyPurchaseItem = { ...purchaseItem, amount };
    }

    // Get purchase items (single or multiple)
    const purchaseItems = registrationPurchaseItems.length > 0
      ? registrationPurchaseItems
      : legacyPurchaseItem
      ? [legacyPurchaseItem]
      : [];

    return NextResponse.json({
      registration: {
        id: registration.id,
        registrationKey: registration.registrationKey,
        eventId: registration.eventId,
        purchaseItemId: registration.purchaseItemId,
        contactName: registration.contactName,
        contactPhone: registration.contactPhone,
        contactEmail: registration.contactEmail,
        paymentMethod: registration.paymentMethod,
        totalAmount: registration.totalAmount,
        couponCode: registration.couponCode,
        discountAmount: registration.discountAmount,
        paymentStatus: registration.paymentStatus,
        paymentScreenshotUrl: registration.paymentScreenshotUrl,
        paymentNote: registration.paymentNote,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
      },
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        coverUrl: event.coverUrl,
        startAt: event.startAt,
        endAt: event.endAt,
        location,
        organizer,
        bankInfo,
      },
      purchaseItem, // For backward compatibility
      purchaseItems, // Array of purchase items (for multiple selection)
      attendees: attendees.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        checkedIn: a.checkedIn || false,
        checkedInAt: a.checkedInAt,
      })),
    });
  } catch (e) {
    console.error("Get registration error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * 更新報名記錄（用於付款回報）
 * 不需登入，使用註冊金鑰驗證
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const registrationKey = (await params).registrationKey?.trim();
    if (!registrationKey) {
      return NextResponse.json({ error: "請提供註冊金鑰" }, { status: 400 });
    }

    // 取得報名記錄
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.registrationKey, registrationKey))
      .limit(1);

    if (!registration) {
      return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const updates: Partial<{
      paymentScreenshotUrl: string | null;
      paymentNote: string | null;
      paymentStatus: string;
    }> = {};

    // 更新付款截圖
    if (body.paymentScreenshotUrl !== undefined) {
      updates.paymentScreenshotUrl =
        body.paymentScreenshotUrl === null || body.paymentScreenshotUrl === ""
          ? null
          : String(body.paymentScreenshotUrl);
    }

    // 更新付款備註（銀行末五碼或其他訊息）
    if (body.paymentNote !== undefined) {
      updates.paymentNote =
        body.paymentNote === null || body.paymentNote === ""
          ? null
          : String(body.paymentNote);
    }

    // 提供截圖或備註即視為「已回報付款」。
    // 被退回（rejected）的人重新回報時也要能回到 reported，否則狀態會卡在已拒絕。
    if (
      (updates.paymentScreenshotUrl !== undefined ||
        updates.paymentNote !== undefined) &&
      (registration.paymentStatus === "pending" ||
        registration.paymentStatus === "rejected") &&
      (updates.paymentScreenshotUrl !== null || updates.paymentNote !== null)
    ) {
      updates.paymentStatus = "reported";
    }

    // 這支端點只靠 registrationKey 辨識、不需登入，因此「不接受」body 指定付款狀態：
    // 否則持有自己報名連結的人就能把自己標記為 confirmed，繞過主辦確認收款。
    // 主辦端的狀態變更一律走需要登入的
    // PATCH /api/events/[eventId]/registrations/[registrationId]。

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ registration });
    }

    const [updated] = await db
      .update(eventRegistrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventRegistrations.registrationKey, registrationKey))
      .returning();

    return NextResponse.json({ registration: updated });
  } catch (e) {
    console.error("Update registration error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
