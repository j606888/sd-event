import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
} from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/** 產生 URL 安全的註冊金鑰（約 16 字元） */
function generateRegistrationKey(): string {
  return randomBytes(12).toString("base64url");
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

    if (
      !contactName ||
      !contactPhone ||
      !contactEmail ||
      !Number.isInteger(totalAmount) ||
      totalAmount <= 0 ||
      attendees.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "請提供有效的聯絡人資訊（姓名、電話、信箱）、總金額與至少一位參加者",
        },
        { status: 400 }
      );
    }

    // 驗證 email 格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "請提供有效的 email" }, { status: 400 });
    }

    // 驗證購買項目是否存在（如果提供）
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
        purchaseItemId: Number.isInteger(purchaseItemId) ? purchaseItemId : null,
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

    // 建立參加者記錄
    const attendeeValues = validAttendees.map((a: any) => ({
      registrationId: registration.id,
      name: a.name.trim(),
      role: a.role,
    }));

    await db.insert(eventAttendees).values(attendeeValues);

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
