import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventPurchaseItems, events, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin, requireTeamMember } from "@/lib/api-auth";
import { isEventType, type EventType } from "@/lib/event-templates";
import { normalizeFlagLabel } from "@/lib/attendee-flag";
import { apiError } from "@/lib/api-error";
import { and, count, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/** 取得單一活動（需為該團隊成員） */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = rows[0];
  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  return NextResponse.json({ event });
}

/** 更新活動（草稿欄位） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const rows = await db
    .select({
      teamId: events.teamId,
      status: events.status,
      locationId: events.locationId,
      bankInfoId: events.bankInfoId,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamAdmin(existing.teamId, session.userId);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    title: string;
    type: EventType;
    description: string | null;
    coverUrl: string | null;
    startAt: Date;
    endAt: Date;
    locationId: number | null;
    organizerId: number | null;
    bankInfoId: number | null;
    linePayeeId: number | null;
    allowMultiplePurchase: boolean;
    autoCalcAmount: boolean;
    attendeeFlagLabel: string | null;
    status: "draft" | "published";
  }> = {};

  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (isEventType(body.type)) updates.type = body.type;
  if (body.description !== undefined) updates.description = body.description === null ? null : String(body.description);
  if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl === null ? null : String(body.coverUrl);
  if (body.startAt != null) updates.startAt = new Date(body.startAt);
  if (body.endAt != null) updates.endAt = new Date(body.endAt);
  if (body.locationId !== undefined) updates.locationId = body.locationId == null ? null : Number(body.locationId);
  if (body.organizerId !== undefined) updates.organizerId = body.organizerId == null ? null : Number(body.organizerId);
  if (body.bankInfoId !== undefined) updates.bankInfoId = body.bankInfoId == null ? null : Number(body.bankInfoId);
  if (body.linePayeeId !== undefined) updates.linePayeeId = body.linePayeeId == null ? null : Number(body.linePayeeId);
  if (typeof body.allowMultiplePurchase === "boolean") updates.allowMultiplePurchase = body.allowMultiplePurchase;
  if (typeof body.autoCalcAmount === "boolean") updates.autoCalcAmount = body.autoCalcAmount;
  if (body.attendeeFlagLabel !== undefined) {
    updates.attendeeFlagLabel =
      body.attendeeFlagLabel === null ? null : normalizeFlagLabel(String(body.attendeeFlagLabel));
  }
  if (body.status === "draft" || body.status === "published") updates.status = body.status;

  // 草稿可以先缺地點、收款帳戶、票券（建立活動時「之後再填」），發布前要補齊；
  // 已發布的活動也不能把地點或帳戶改成空的
  const publishing = updates.status === "published" && existing.status !== "published";
  if ((updates.status ?? existing.status) === "published") {
    const locationId = "locationId" in updates ? updates.locationId : existing.locationId;
    const bankInfoId = "bankInfoId" in updates ? updates.bankInfoId : existing.bankInfoId;
    if (publishing || "locationId" in updates || "bankInfoId" in updates) {
      if (locationId == null) return apiError("eventApiErrors.events.publishNeedsLocation", 400);
      if (bankInfoId == null) return apiError("eventApiErrors.events.publishNeedsBankInfo", 400);
    }
  }
  if (publishing) {
    const [tickets] = await db
      .select({ n: count() })
      .from(eventPurchaseItems)
      .where(and(eq(eventPurchaseItems.eventId, eventId), eq(eventPurchaseItems.hidden, false)));
    if (!tickets || tickets.n === 0) return apiError("eventApiErrors.events.publishNeedsTickets", 400);
  }

  if (Object.keys(updates).length === 0) {
    const [e] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    return NextResponse.json({ event: e });
  }

  const [updated] = await db
    .update(events)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return NextResponse.json({ event: updated });
}

/** 刪除活動（需為該團隊成員） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const rows = await db
    .select({ teamId: events.teamId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamAdmin(existing.teamId, session.userId);
  if (forbidden) return forbidden;

  // Allow deletion only for event creator or team owner
  if (existing.userId !== session.userId) {
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, existing.teamId),
          eq(teamMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (!membership || membership.role !== "owner") {
      return apiError("eventApiErrors.events.deleteForbidden", 403);
    }
  }

  await db.delete(events).where(eq(events.id, eventId));
  return NextResponse.json({ ok: true });
}
