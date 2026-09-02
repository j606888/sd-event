import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventPurchaseItemPrices,
  eventPriceTiers,
  eventRegistrationPurchaseItems,
  teamMembers,
  eventLocations,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { eq, and, asc, inArray } from "drizzle-orm";
import { createHistoricalPriceResolver } from "@/lib/registration-pricing";

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
    .where(eq(eventAttendees.registrationId, registrationId))
    // 沒有 ORDER BY 的話，任何一次 UPDATE（例如入場）都會讓 Postgres
    // 回傳不同的順序，畫面上的參加者就會在按下入場後跳位
    .orderBy(asc(eventAttendees.id));

  // 取得購買項目（單選或多選）。單選舊資料沒有單價快照，
  // 以報名時間回推當時生效的時段價，避免顯示成 fallback 段（現場價）。
  const purchaseItem = registration.purchaseItemId
    ? await db
        .select()
        .from(eventPurchaseItems)
        .where(eq(eventPurchaseItems.id, registration.purchaseItemId))
        .limit(1)
        .then((rows) => rows[0] || null)
    : null;

  let legacyPurchaseItem:
    | (NonNullable<typeof purchaseItem> & { tierName: string | null })
    | null = null;
  if (purchaseItem) {
    const [tiers, priceRows] = await Promise.all([
      db
        .select()
        .from(eventPriceTiers)
        .where(eq(eventPriceTiers.eventId, eventId))
        .orderBy(asc(eventPriceTiers.sortOrder)),
      db
        .select()
        .from(eventPurchaseItemPrices)
        .where(eq(eventPurchaseItemPrices.purchaseItemId, purchaseItem.id)),
    ]);
    const { amount, tierName } = createHistoricalPriceResolver(tiers, priceRows)(
      purchaseItem.id,
      purchaseItem.amount,
      registration.createdAt
    );
    legacyPurchaseItem = { ...purchaseItem, amount, tierName };
  }

  // 取得 join table 內的購買項目（多選 / 群組活動）。一律查詢，有列就用。
  // 金額優先用報名當下的單價快照（unitAmount，含時段價），舊資料為 null 時退回項目定價。
  const registrationPurchaseItems = await db
    .select({
      id: eventPurchaseItems.id,
      name: eventPurchaseItems.name,
      amount: eventPurchaseItems.amount,
      unitAmount: eventRegistrationPurchaseItems.unitAmount,
      tierName: eventRegistrationPurchaseItems.tierName,
    })
    .from(eventRegistrationPurchaseItems)
    .innerJoin(
      eventPurchaseItems,
      eq(eventRegistrationPurchaseItems.purchaseItemId, eventPurchaseItems.id)
    )
    .where(eq(eventRegistrationPurchaseItems.registrationId, registrationId))
    .then((rows) =>
      rows.map(({ unitAmount, tierName, ...row }) => ({
        ...row,
        amount: unitAmount ?? row.amount,
        tierName,
      }))
    );

  const purchaseItems = registrationPurchaseItems.length > 0
    ? registrationPurchaseItems
    : legacyPurchaseItem
    ? [legacyPurchaseItem]
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
      purchaseItem: legacyPurchaseItem, // For backward compatibility
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

  const updates: Partial<{
    paymentStatus: string;
    hidden: boolean;
    contactName: string;
    contactPhone: string | null;
    contactEmail: string | null;
    totalAmount: number;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (
    typeof body.paymentStatus === "string" &&
    ["pending", "reported", "confirmed", "rejected"].includes(body.paymentStatus)
  ) {
    updates.paymentStatus = body.paymentStatus;
  }

  if (typeof body.hidden === "boolean") {
    updates.hidden = body.hidden;
  }

  // ----- 主辦端編輯欄位 -----
  if (typeof body.contactName === "string" && body.contactName.trim()) {
    updates.contactName = body.contactName.trim();
  }

  if (typeof body.contactPhone === "string") {
    updates.contactPhone = body.contactPhone.trim() || null;
  }

  if (typeof body.contactEmail === "string") {
    const email = body.contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "請提供有效的 email" }, { status: 400 });
    }
    updates.contactEmail = email || null;
  }

  if (body.totalAmount !== undefined) {
    const amount = Number(body.totalAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "請提供有效的總金額" }, { status: 400 });
    }
    updates.totalAmount = amount;
  }

  // ----- 參加者編輯（新增 / 修改 / 刪除，保留既有入場狀態） -----
  let attendeeEdits:
    | { id?: number; name: string; role: string }[]
    | null = null;
  if (Array.isArray(body.attendees)) {
    const cleaned = body.attendees
      .map((a: { id?: unknown; name?: unknown; role?: unknown }) => ({
        id: Number.isInteger(a.id) ? (a.id as number) : undefined,
        name: typeof a.name === "string" ? a.name.trim() : "",
        role: typeof a.role === "string" ? a.role : "",
      }))
      .filter(
        (a: { name: string; role: string }) =>
          a.name && ["Leader", "Follower", "Not sure"].includes(a.role)
      );
    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: "請提供至少一位有效的參加者（姓名與角色）" },
        { status: 400 }
      );
    }
    attendeeEdits = cleaned;
  }

  const hasRegUpdates =
    updates.paymentStatus !== undefined ||
    updates.hidden !== undefined ||
    updates.contactName !== undefined ||
    updates.contactPhone !== undefined ||
    updates.contactEmail !== undefined ||
    updates.totalAmount !== undefined;

  if (hasRegUpdates || attendeeEdits) {
    const updated = await db.transaction(async (tx) => {
      let row = registration;
      if (hasRegUpdates) {
        const [r] = await tx
          .update(eventRegistrations)
          .set(updates)
          .where(eq(eventRegistrations.id, registrationId))
          .returning();
        if (r) row = r;
      }

      if (attendeeEdits) {
        const existing = await tx
          .select({ id: eventAttendees.id })
          .from(eventAttendees)
          .where(eq(eventAttendees.registrationId, registrationId));
        const existingIds = new Set(existing.map((e) => e.id));
        const keptIds = new Set<number>();

        for (const a of attendeeEdits) {
          if (a.id != null && existingIds.has(a.id)) {
            // 更新既有參加者（保留 checkedIn / checkedInAt）
            await tx
              .update(eventAttendees)
              .set({ name: a.name, role: a.role, updatedAt: new Date() })
              .where(eq(eventAttendees.id, a.id));
            keptIds.add(a.id);
          } else {
            // 新增參加者
            await tx
              .insert(eventAttendees)
              .values({ registrationId, name: a.name, role: a.role });
          }
        }

        // 刪除不在清單中的既有參加者
        const toDelete = existing
          .map((e) => e.id)
          .filter((id) => !keptIds.has(id));
        if (toDelete.length > 0) {
          await tx
            .delete(eventAttendees)
            .where(inArray(eventAttendees.id, toDelete));
        }
      }

      return row;
    });

    // When creator confirms payment, send notification email to contact
    // （現場現金報名可能沒有 email，此時略過寄信）
    if (
      updated &&
      updated.contactEmail &&
      updates.paymentStatus === "confirmed" &&
      registration.paymentStatus !== "confirmed"
    ) {
      let location: { name: string; googleMapUrl: string | null } | null = null;
      if (event.locationId) {
        const [loc] = await db
          .select({
            name: eventLocations.name,
            googleMapUrl: eventLocations.googleMapUrl,
          })
          .from(eventLocations)
          .where(eq(eventLocations.id, event.locationId))
          .limit(1);
        if (loc) {
          location = {
            name: loc.name,
            googleMapUrl: loc.googleMapUrl ?? null,
          };
        }
      }

      sendPaymentConfirmedEmail(
        updated.contactEmail,
        updated.registrationKey,
        event.title ?? undefined,
        event.startAt ? new Date(event.startAt).toISOString() : undefined,
        event.endAt ? new Date(event.endAt).toISOString() : undefined,
        location
      ).catch((err) =>
        console.error("Payment confirmed email error:", err)
      );
    }

    return NextResponse.json({ registration: updated });
  }

  return NextResponse.json({ registration });
}
