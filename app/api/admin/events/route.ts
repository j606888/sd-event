import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations, teams, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/api-auth";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

/** 全站活動清單，可用 ?userId= / ?teamId= 篩選 */
export async function GET(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const teamIdParam = searchParams.get("teamId");

  const conditions = [];
  if (userIdParam) {
    const userId = Number(userIdParam);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "無效的 userId" }, { status: 400 });
    }
    conditions.push(eq(events.userId, userId));
  }
  if (teamIdParam) {
    const teamId = Number(teamIdParam);
    if (!Number.isInteger(teamId)) {
      return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
    }
    conditions.push(eq(events.teamId, teamId));
  }

  const list = await db
    .select({
      id: events.id,
      publicKey: events.publicKey,
      title: events.title,
      type: events.type,
      status: events.status,
      startAt: events.startAt,
      endAt: events.endAt,
      createdAt: events.createdAt,
      teamId: events.teamId,
      teamName: teams.name,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(events)
    .innerJoin(teams, eq(teams.id, events.teamId))
    .innerJoin(users, eq(users.id, events.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(events.createdAt));

  const eventIds = list.map((e) => e.id);
  if (eventIds.length === 0) return NextResponse.json({ events: [] });

  const stats = await db
    .select({
      eventId: eventRegistrations.eventId,
      registrationCount: count(),
      revenue: sql<number>`coalesce(sum(${eventRegistrations.totalAmount}), 0)`,
    })
    .from(eventRegistrations)
    .where(
      and(
        inArray(eventRegistrations.eventId, eventIds),
        eq(eventRegistrations.hidden, false)
      )
    )
    .groupBy(eventRegistrations.eventId);

  const statMap = new Map(stats.map((s) => [s.eventId, s]));

  return NextResponse.json({
    events: list.map((e) => ({
      ...e,
      registrationCount: statMap.get(e.id)?.registrationCount ?? 0,
      revenue: Number(statMap.get(e.id)?.revenue ?? 0),
    })),
  });
}
