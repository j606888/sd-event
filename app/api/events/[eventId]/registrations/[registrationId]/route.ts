import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
  teamMembers,
  eventLocations,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ eventId: string; registrationId: string }>;
};

/**
 * 取得單一報名記錄詳情（需為該團隊成員）
 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  const registrationId = Number((await params).registrationId);

  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    return NextResponse.json(
      { error: "無效的 eventId 或 registrationId" },
      { status: 400 }
    );
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

  // 取得報名記錄
  const [registration] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, registrationId),
        eq(eventRegistrations.eventId, eventId)
      )
    )
    .limit(1);

  if (!registration) {
    return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
  }

  // 取得參加者
  const attendees = await db
    .select()
    .from(eventAttendees)
    .where(eq(eventAttendees.registrationId, registrationId));

  // 取得購買項目（單選或多選）
  const purchaseItem = registration.purchaseItemId
    ? await db
        .select()
        .from(eventPurchaseItems)
        .where(eq(eventPurchaseItems.id, registration.purchaseItemId))
        .limit(1)
        .then((rows) => rows[0] || null)
    : null;

  // 取得多選購買項目
  const registrationPurchaseItems = event.allowMultiplePurchase
    ? await db
        .select({
          id: eventPurchaseItems.id,
          name: eventPurchaseItems.name,
          amount: eventPurchaseItems.amount,
        })
        .from(eventRegistrationPurchaseItems)
        .innerJoin(
          eventPurchaseItems,
          eq(eventRegistrationPurchaseItems.purchaseItemId, eventPurchaseItems.id)
        )
        .where(eq(eventRegistrationPurchaseItems.registrationId, registrationId))
    : [];

  const purchaseItems = event.allowMultiplePurchase && registrationPurchaseItems.length > 0
    ? registrationPurchaseItems
    : purchaseItem
    ? [purchaseItem]
    : [];

  return NextResponse.json({
    registration: {
      ...registration,
      attendees: attendees.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        checkedIn: a.checkedIn || false,
        checkedInAt: a.checkedInAt,
      })),
      purchaseItem, // For backward compatibility
      purchaseItems, // Array of purchase items (for multiple selection)
    },
  });
}

/**
 * 更新報名記錄狀態（需為該團隊成員）
 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  const registrationId = Number((await params).registrationId);

  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    return NextResponse.json(
      { error: "無效的 eventId 或 registrationId" },
      { status: 400 }
    );
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

  // 取得報名記錄
  const [registration] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, registrationId),
        eq(eventRegistrations.eventId, eventId)
      )
    )
    .limit(1);

  if (!registration) {
    return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // 只允許更新付款狀態
  if (
    typeof body.paymentStatus === "string" &&
    ["pending", "reported", "confirmed", "rejected"].includes(body.paymentStatus)
  ) {
    const [updated] = await db
      .update(eventRegistrations)
      .set({
        paymentStatus: body.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(eventRegistrations.id, registrationId))
      .returning();

    // When creator confirms payment, send notification email to contact
    if (updated && body.paymentStatus === "confirmed" && registration.paymentStatus !== "confirmed") {
      let locationName: string | null = null;
      if (event.locationId) {
        const [location] = await db
          .select({ name: eventLocations.name })
          .from(eventLocations)
          .where(eq(eventLocations.id, event.locationId))
          .limit(1);
        locationName = location?.name ?? null;
      }

      sendPaymentConfirmedEmail(
        updated.contactEmail,
        updated.registrationKey,
        event.title ?? undefined,
        event.startAt ? new Date(event.startAt).toISOString() : undefined,
        event.endAt ? new Date(event.endAt).toISOString() : undefined,
        locationName
      ).catch((err) =>
        console.error("Payment confirmed email error:", err)
      );
    }

    return NextResponse.json({ registration: updated });
  }

  return NextResponse.json({ registration });
}
