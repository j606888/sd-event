import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  teams,
  teamMembers,
  events,
  eventRegistrations,
} from "@/db/schema";
import { requireSuperAdmin } from "@/lib/api-auth";
import { desc, eq, ilike, inArray, or, sql, count } from "drizzle-orm";

/** 全站使用者清單（含活躍度與使用量） */
export async function GET(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  const where = q
    ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))
    : undefined;

  const list = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isSuperAdmin: users.isSuperAdmin,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(sql`${users.lastLoginAt} desc nulls last`, desc(users.createdAt));

  const userIds = list.map((u) => u.id);
  if (userIds.length === 0) return NextResponse.json({ users: [] });

  // 所屬團隊
  const memberships = await db
    .select({
      userId: teamMembers.userId,
      teamId: teams.id,
      teamName: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(inArray(teamMembers.userId, userIds));

  // 建立的活動數
  const eventCounts = await db
    .select({ userId: events.userId, count: count() })
    .from(events)
    .where(inArray(events.userId, userIds))
    .groupBy(events.userId);

  // 收到的報名數（以活動建立者歸戶）
  const registrationCounts = await db
    .select({ userId: events.userId, count: count() })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(inArray(events.userId, userIds))
    .groupBy(events.userId);

  const eventCountMap = new Map(eventCounts.map((r) => [r.userId, r.count]));
  const regCountMap = new Map(
    registrationCounts.map((r) => [r.userId, r.count])
  );

  return NextResponse.json({
    users: list.map((u) => ({
      ...u,
      teams: memberships
        .filter((m) => m.userId === u.id)
        .map((m) => ({ id: m.teamId, name: m.teamName, role: m.role })),
      eventCount: eventCountMap.get(u.id) ?? 0,
      registrationCount: regCountMap.get(u.id) ?? 0,
    })),
  });
}
