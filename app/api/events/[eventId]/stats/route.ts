import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations, eventAttendees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray, and } from "drizzle-orm";

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

  // Get non-hidden registrations for this event (hidden registrations excluded from stats)
  const regs = await db
    .select({
      id: eventRegistrations.id,
      paymentStatus: eventRegistrations.paymentStatus,
      totalAmount: eventRegistrations.totalAmount,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false)
      )
    );
  const registrationIds = regs.map((r) => r.id);

  if (registrationIds.length === 0) {
    return NextResponse.json({
      roleCounts: { Leader: 0, Follower: 0, "Not sure": 0 },
      totalAttendees: 0,
      checkedInCount: 0,
      paymentAmountTotals: {
        confirmed: 0,
        reported: 0,
        pending: 0,
      },
    });
  }

  const allAttendees = await db
    .select({
      registrationId: eventAttendees.registrationId,
      role: eventAttendees.role,
      checkedIn: eventAttendees.checkedIn,
    })
    .from(eventAttendees)
    .where(inArray(eventAttendees.registrationId, registrationIds));

  const totalAttendees = allAttendees.length;
  let checkedInCount = 0;
  const roleCountsResult = { Leader: 0, Follower: 0, "Not sure": 0 };
  const paymentAmountTotals = {
    confirmed: 0,
    reported: 0,
    pending: 0,
  };
  for (const reg of regs) {
    if (reg.paymentStatus === "confirmed") {
      paymentAmountTotals.confirmed += reg.totalAmount;
    } else if (reg.paymentStatus === "reported") {
      paymentAmountTotals.reported += reg.totalAmount;
    } else {
      // Treat pending/rejected/unknown as receivable-uncollected bucket.
      paymentAmountTotals.pending += reg.totalAmount;
    }
  }

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
    paymentAmountTotals,
  });
}
