import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations, eventAttendees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

const ROLES = ["Leader", "Follower", "Not sure"] as const;

/**
 * GET event stats: attendee counts by role (Leader, Follower, Not sure) and check-in totals.
 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const [event] = await db
    .select({ id: events.id, teamId: events.teamId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // Get all registration IDs for this event
  const regs = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, eventId));
  const registrationIds = regs.map((r) => r.id);

  if (registrationIds.length === 0) {
    return NextResponse.json({
      roleCounts: { Leader: 0, Follower: 0, "Not sure": 0 },
      totalAttendees: 0,
      checkedInCount: 0,
    });
  }

  const allAttendees = await db
    .select({
      role: eventAttendees.role,
      checkedIn: eventAttendees.checkedIn,
    })
    .from(eventAttendees)
    .where(inArray(eventAttendees.registrationId, registrationIds));

  let totalAttendees = allAttendees.length;
  let checkedInCount = 0;
  const roleCountsResult = { Leader: 0, Follower: 0, "Not sure": 0 };
  for (const a of allAttendees) {
    if (a.checkedIn) checkedInCount++;
    if (ROLES.includes(a.role as (typeof ROLES)[number])) {
      roleCountsResult[a.role as (typeof ROLES)[number]]++;
    }
  }

  return NextResponse.json({
    roleCounts: roleCountsResult,
    totalAttendees,
    checkedInCount,
  });
}
