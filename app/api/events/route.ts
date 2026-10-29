import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/db";
import { events, eventRegistrations, eventAttendees, teamMembers, eventLocations, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getTeamRole, requireAuth, requireTeamAdmin, requireTeamMember } from "@/lib/api-auth";
import { isTeamAdmin } from "@/lib/team-roles";
import { isEventType } from "@/lib/event-templates";
import { normalizeFlagLabel } from "@/lib/attendee-flag";
import { apiError } from "@/lib/api-error";
import { eq, ne, inArray, desc, count, and, sql } from "drizzle-orm";

function generatePublicKey(): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  const generateRandomKey = customAlphabet(alphabet, 8);
  return generateRandomKey()
}

/** 取得活動列表（可選 ?teamId= 篩選，否則回傳當前使用者所屬團隊的活動） */
export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  // Get user's active team
  const userRows = await db
    .select({
      activeTeamId: users.activeTeamId,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = userRows[0];
  const activeTeamId = user?.activeTeamId ?? null;

  const { searchParams } = new URL(request.url);
  const teamIdParam = searchParams.get("teamId");
  const teamId = teamIdParam ? Number(teamIdParam) : activeTeamId;

  // If no active team and no teamId param, return empty array
  if (teamId == null) {
    return NextResponse.json({ events: [] });
  }

  if (!Number.isInteger(teamId)) {
    return apiError("eventApiErrors.invalidTeamId", 400);
  }

  // Verify user is a member of this team
  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;
    const list = await db
      .select({
        id: events.id,
        publicKey: events.publicKey,
        teamId: events.teamId,
        userId: events.userId,
        title: events.title,
        description: events.description,
        coverUrl: events.coverUrl,
        status: events.status,
        startAt: events.startAt,
        endAt: events.endAt,
        locationId: events.locationId,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(eq(events.teamId, teamId))
      .orderBy(desc(events.createdAt));

    const eventIds = list.map((e) => e.id);
    const registrationCounts =
      eventIds.length > 0
        ? await db
            .select({
              eventId: eventRegistrations.eventId,
              count: count(),
              awaitingConfirmation: sql<number>`cast(count(case when ${eventRegistrations.paymentStatus} = 'reported' then 1 end) as int)`,
            })
            .from(eventRegistrations)
            .where(
              and(
                inArray(eventRegistrations.eventId, eventIds),
                eq(eventRegistrations.hidden, false),
                ne(eventRegistrations.paymentStatus, "refunded")
              )
            )
            .groupBy(eventRegistrations.eventId)
        : [];
    const countMap = new Map(
      registrationCounts.map((r) => [r.eventId, Number(r.count)])
    );
    const awaitingMap = new Map(
      registrationCounts.map((r) => [r.eventId, Number(r.awaitingConfirmation)])
    );

    // 列表上直接看得到每場來了多少人、入場幾人（只算未隱藏、未退款的報名）
    const attendeeTotals =
      eventIds.length > 0
        ? await db
            .select({
              eventId: eventRegistrations.eventId,
              total: count(),
              checkedIn: sql<number>`cast(count(case when ${eventAttendees.checkedIn} then 1 end) as int)`,
            })
            .from(eventAttendees)
            .innerJoin(
              eventRegistrations,
              eq(eventRegistrations.id, eventAttendees.registrationId)
            )
            .where(
              and(
                inArray(eventRegistrations.eventId, eventIds),
                eq(eventRegistrations.hidden, false),
                ne(eventRegistrations.paymentStatus, "refunded")
              )
            )
            .groupBy(eventRegistrations.eventId)
        : [];
    const attendeeMap = new Map(attendeeTotals.map((r) => [r.eventId, r]));

    // 待確認收款筆數屬於款項資訊，驗票人員不回
    const canSeeMoney = isTeamAdmin(await getTeamRole(teamId, session.userId));

    // Fetch locations for events
    const locationIds = list
      .map((e) => e.locationId)
      .filter((id): id is number => id !== null);
    const locations =
      locationIds.length > 0
        ? await db
            .select()
            .from(eventLocations)
            .where(inArray(eventLocations.id, locationIds))
        : [];
    const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

    const eventsWithCount = list.map((e) => ({
      ...e,
      registrationCount: countMap.get(e.id) ?? 0,
      attendeeCount: Number(attendeeMap.get(e.id)?.total ?? 0),
      checkedInCount: Number(attendeeMap.get(e.id)?.checkedIn ?? 0),
      ...(canSeeMoney && { awaitingConfirmationCount: awaitingMap.get(e.id) ?? 0 }),
      location: e.locationId ? locationMap.get(e.locationId) || null : null,
    }));
    return NextResponse.json({ events: eventsWithCount });
}

/** 建立新活動 */
export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const body = await request.json().catch(() => ({}));
  const teamId = Number(body.teamId);
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!Number.isInteger(teamId) || !title) {
    return apiError("eventApiErrors.events.createInvalid", 400);
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const type = isEventType(body.type) ? body.type : "Party";
  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : new Date();
  const description = typeof body.description === "string" ? body.description : null;
  const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl : null;
  const locationId = body.locationId != null ? Number(body.locationId) : null;
  const organizerId = body.organizerId != null ? Number(body.organizerId) : null;
  const bankInfoId = body.bankInfoId != null ? Number(body.bankInfoId) : null;
  const linePayeeId = body.linePayeeId != null ? Number(body.linePayeeId) : null;
  const allowMultiplePurchase = Boolean(body.allowMultiplePurchase);
  const autoCalcAmount = Boolean(body.autoCalcAmount);
  const attendeeFlagLabel =
    typeof body.attendeeFlagLabel === "string" ? normalizeFlagLabel(body.attendeeFlagLabel) : null;
  const publicKey = generatePublicKey();

  const [event] = await db
    .insert(events)
    .values({
      publicKey,
      teamId,
      userId: session.userId,
      title,
      type,
      description,
      coverUrl,
      startAt,
      endAt,
      locationId: Number.isInteger(locationId) ? locationId : null,
      organizerId: Number.isInteger(organizerId) ? organizerId : null,
      bankInfoId: Number.isInteger(bankInfoId) ? bankInfoId : null,
      linePayeeId: Number.isInteger(linePayeeId) ? linePayeeId : null,
      allowMultiplePurchase,
      autoCalcAmount,
      attendeeFlagLabel,
      // 建立後先進草稿，主辦方按「發布」才對外開放
      status: "draft",
    })
    .returning({
      id: events.id,
      publicKey: events.publicKey,
      teamId: events.teamId,
      userId: events.userId,
      title: events.title,
      status: events.status,
      startAt: events.startAt,
      endAt: events.endAt,
      createdAt: events.createdAt,
    });

  if (!event) {
    return apiError("eventApiErrors.events.createFailed", 500);
  }

  return NextResponse.json({ event });
}
