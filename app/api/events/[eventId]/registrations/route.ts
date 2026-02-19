import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
  teamMembers,
} from "@/db/schema";
import { sendRegistrationSuccessEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, desc, count, or, like, and } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

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

  // 取得搜尋參數
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  // 建立查詢條件
  const whereConditions = [eq(eventRegistrations.eventId, eventId)];

  // 如果有搜尋條件，加入搜尋
  if (search) {
    whereConditions.push(
      or(
        like(eventRegistrations.contactName, `%${search}%`),
        like(eventRegistrations.paymentNote, `%${search}%`),
        like(eventRegistrations.contactPhone, `%${search}%`)
      )!
    );
  }

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
      totalAmount: eventRegistrations.totalAmount,
      paymentStatus: eventRegistrations.paymentStatus,
      paymentScreenshotUrl: eventRegistrations.paymentScreenshotUrl,
      paymentNote: eventRegistrations.paymentNote,
      createdAt: eventRegistrations.createdAt,
      updatedAt: eventRegistrations.updatedAt,
    })
    .from(eventRegistrations)
    .where(and(...whereConditions))
    .orderBy(desc(eventRegistrations.createdAt));

  // 取得每個報名的參加者數量與已入場數量
  const registrationIds = registrations.map((r) => r.id);
  const attendeesCounts =
    registrationIds.length > 0
      ? await db
          .select({
            registrationId: eventAttendees.registrationId,
            count: count(),
          })
          .from(eventAttendees)
          .where(
            or(...registrationIds.map((id) => eq(eventAttendees.registrationId, id)))
          )
          .groupBy(eventAttendees.registrationId)
      : [];

  const checkedInCounts =
    registrationIds.length > 0
      ? await db
          .select({
            registrationId: eventAttendees.registrationId,
            count: count(),
          })
          .from(eventAttendees)
          .where(
            and(
              or(...registrationIds.map((id) => eq(eventAttendees.registrationId, id))),
              eq(eventAttendees.checkedIn, true)
            )
          )
          .groupBy(eventAttendees.registrationId)
      : [];

  const countMap = new Map(
    attendeesCounts.map((a) => [a.registrationId, Number(a.count)])
  );
  const checkedInMap = new Map(
    checkedInCounts.map((a) => [a.registrationId, Number(a.count)])
  );

  // 組合結果
  const result = registrations.map((reg) => ({
    ...reg,
    attendeeCount: countMap.get(reg.id) || 0,
    checkedInCount: checkedInMap.get(reg.id) || 0,
  }));

  return NextResponse.json({ registrations: result });
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
    const attendees =
      Array.isArray(body.attendees) && body.attendees.length > 0
        ? body.attendees
        : [];

    // Check if event allows multiple purchase
    const hasPurchaseItems = event.allowMultiplePurchase 
      ? purchaseItemIds.length > 0
      : purchaseItemId != null;

    if (
      !contactName ||
      !contactPhone ||
      !contactEmail ||
      !Number.isInteger(totalAmount) ||
      totalAmount <= 0 ||
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
    if (event.allowMultiplePurchase) {
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
        .where(eq(eventPurchaseItems.eventId, eventId));
      const validItemIds = purchaseItems.map((item) => item.id);
      const invalidIds = purchaseItemIds.filter((id: number) => !validItemIds.includes(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "無效的購買項目" },
          { status: 400 }
        );
      }
    } else {
      // Single selection: validate single purchase item
      if (purchaseItemId != null) {
        const [purchaseItem] = await db
          .select()
          .from(eventPurchaseItems)
          .where(eq(eventPurchaseItems.id, purchaseItemId))
          .limit(1);

        if (!purchaseItem || purchaseItem.eventId !== eventId) {
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

    const registrationKey = generateRegistrationKey();

    // 建立報名記錄
    const [registration] = await db
      .insert(eventRegistrations)
      .values({
        registrationKey,
        eventId,
        purchaseItemId: event.allowMultiplePurchase ? null : (Number.isInteger(purchaseItemId) ? purchaseItemId : null),
        contactName,
        contactPhone,
        contactEmail,
        paymentMethod,
        totalAmount,
        paymentStatus: "pending",
      })
      .returning();

    if (!registration) {
      return NextResponse.json({ error: "建立報名失敗" }, { status: 500 });
    }

    // 建立購買項目關聯（多選時）
    if (event.allowMultiplePurchase && purchaseItemIds.length > 0) {
      const registrationPurchaseItemValues = purchaseItemIds.map((itemId: number) => ({
        registrationId: registration.id,
        purchaseItemId: itemId,
        quantity: 1, // Default quantity, can be extended later
      }));
      if (registrationPurchaseItemValues.length > 0) {
        await db.insert(eventRegistrationPurchaseItems).values(registrationPurchaseItemValues);
      }
    }

    // 建立參加者記錄
    const attendeeValues = validAttendees.map((a: any) => ({
      registrationId: registration.id,
      name: a.name.trim(),
      role: a.role,
    }));

    await db.insert(eventAttendees).values(attendeeValues);

    // Send confirmation email to contact (non-blocking)
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
        paymentStatus: registration.paymentStatus,
        createdAt: registration.createdAt,
      },
    });
  } catch (e) {
    console.error("Registration creation error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
