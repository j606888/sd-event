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
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

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
    const [location, organizer, bankInfo, purchaseItem] = await Promise.all([
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
    ]);

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
      purchaseItem,
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

    // 如果提供了截圖或備註，將狀態更新為 "reported"
    if (
      (updates.paymentScreenshotUrl !== undefined ||
        updates.paymentNote !== undefined) &&
      registration.paymentStatus === "pending" &&
      (updates.paymentScreenshotUrl !== null || updates.paymentNote !== null)
    ) {
      updates.paymentStatus = "reported";
    }

    // 允許手動更新付款狀態（用於主辦方確認）
    if (
      typeof body.paymentStatus === "string" &&
      ["pending", "reported", "confirmed", "rejected"].includes(
        body.paymentStatus
      )
    ) {
      updates.paymentStatus = body.paymentStatus;
    }

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
