import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/db";
import { events, eventRegistrations, teamMembers, eventLocations, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray, desc, count } from "drizzle-orm";

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
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

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
    return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
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
            })
            .from(eventRegistrations)
            .where(inArray(eventRegistrations.eventId, eventIds))
            .groupBy(eventRegistrations.eventId)
        : [];
    const countMap = new Map(
      registrationCounts.map((r) => [r.eventId, Number(r.count)])
    );

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
      location: e.locationId ? locationMap.get(e.locationId) || null : null,
    }));
    return NextResponse.json({ events: eventsWithCount });
}

/** 建立新活動 */
export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const teamId = Number(body.teamId);
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!Number.isInteger(teamId) || !title) {
    return NextResponse.json(
      { error: "請提供有效的 teamId 與 title" },
      { status: 400 }
    );
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : new Date();
  const description = typeof body.description === "string" ? body.description : null;
  const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl : null;
  const locationId = body.locationId != null ? Number(body.locationId) : null;
  const organizerId = body.organizerId != null ? Number(body.organizerId) : null;
  const bankInfoId = body.bankInfoId != null ? Number(body.bankInfoId) : null;
  const allowMultiplePurchase = Boolean(body.allowMultiplePurchase);
  const publicKey = generatePublicKey();

  const [event] = await db
    .insert(events)
    .values({
      publicKey,
      teamId,
      userId: session.userId,
      title,
      description,
      coverUrl,
      startAt,
      endAt,
      locationId: Number.isInteger(locationId) ? locationId : null,
      organizerId: Number.isInteger(organizerId) ? organizerId : null,
      bankInfoId: Number.isInteger(bankInfoId) ? bankInfoId : null,
      allowMultiplePurchase,
      status: "published",
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
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  return NextResponse.json({ event });
}
