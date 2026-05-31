import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray, and, count, sql } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

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

  // Get non-hidden registrations — only id and purchaseItemId needed now.
  const regs = await db
    .select({
      id: eventRegistrations.id,
      purchaseItemId: eventRegistrations.purchaseItemId,
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
      purchaseItemSummary: [],
    });
  }

  // Query 1: Role counts + total attendees + checked-in count via DB aggregation.
  const attendeeStats = await db
    .select({
      role: eventAttendees.role,
      total: count(),
      checkedInCount: sql<number>`cast(count(case when ${eventAttendees.checkedIn} then 1 end) as int)`,
    })
    .from(eventAttendees)
    .where(inArray(eventAttendees.registrationId, registrationIds))
    .groupBy(eventAttendees.role);

  const totalAttendees = attendeeStats.reduce((s, r) => s + Number(r.total), 0);
  const checkedInCount = attendeeStats.reduce((s, r) => s + Number(r.checkedInCount), 0);
  const roleCounts: Record<string, number> = { Leader: 0, Follower: 0, "Not sure": 0 };
  for (const row of attendeeStats) {
    if (row.role in roleCounts) roleCounts[row.role] = Number(row.total);
  }

  // Query 2: Payment amount totals via GROUP BY.
  const paymentStats = await db
    .select({
      paymentStatus: eventRegistrations.paymentStatus,
      total: sql<number>`cast(sum(${eventRegistrations.totalAmount}) as int)`,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false)
      )
    )
    .groupBy(eventRegistrations.paymentStatus);

  const paymentAmountTotals = { confirmed: 0, reported: 0, pending: 0 };
  for (const row of paymentStats) {
    if (row.paymentStatus === "confirmed") {
      paymentAmountTotals.confirmed = Number(row.total);
    } else if (row.paymentStatus === "reported") {
      paymentAmountTotals.reported = Number(row.total);
    } else {
      // Treat pending/rejected/unknown as receivable-uncollected bucket.
      paymentAmountTotals.pending += Number(row.total);
    }
  }

  // Query 3: Multi-item purchase summary using a subquery for per-registration attendee counts.
  const attCountSubquery = db
    .select({
      registrationId: eventAttendees.registrationId,
      cnt: sql<number>`cast(count(*) as int)`.as("cnt"),
    })
    .from(eventAttendees)
    .where(inArray(eventAttendees.registrationId, registrationIds))
    .groupBy(eventAttendees.registrationId)
    .as("att_counts");

  const multiItemSummary = await db
    .select({
      purchaseItemId: eventRegistrationPurchaseItems.purchaseItemId,
      name: eventPurchaseItems.name,
      amount: eventPurchaseItems.amount,
      attendeeCount: sql<number>`cast(sum(att_counts.cnt * ${eventRegistrationPurchaseItems.quantity}) as int)`,
    })
    .from(eventRegistrationPurchaseItems)
    .innerJoin(eventPurchaseItems, eq(eventRegistrationPurchaseItems.purchaseItemId, eventPurchaseItems.id))
    .innerJoin(attCountSubquery, eq(eventRegistrationPurchaseItems.registrationId, attCountSubquery.registrationId))
    .where(inArray(eventRegistrationPurchaseItems.registrationId, registrationIds))
    .groupBy(
      eventRegistrationPurchaseItems.purchaseItemId,
      eventPurchaseItems.name,
      eventPurchaseItems.amount,
    );

  const summaryMap = new Map<number, { id: number; name: string; amount: number; attendeeCount: number }>();
  const registrationsWithMultiItems = new Set<number>();

  // Build summaryMap from DB-aggregated multi-item results.
  for (const row of multiItemSummary) {
    summaryMap.set(row.purchaseItemId, {
      id: row.purchaseItemId,
      name: row.name,
      amount: row.amount,
      attendeeCount: Number(row.attendeeCount),
    });
  }

  // Determine which registrations are covered by multi-item entries.
  const multiItemRegRows = await db
    .select({ registrationId: eventRegistrationPurchaseItems.registrationId })
    .from(eventRegistrationPurchaseItems)
    .where(inArray(eventRegistrationPurchaseItems.registrationId, registrationIds));
  for (const row of multiItemRegRows) {
    registrationsWithMultiItems.add(row.registrationId);
  }

  // Single-item (legacy) path: registrations using the purchaseItemId field directly.
  const singleItemRegs = regs.filter(
    (reg) => reg.purchaseItemId != null && !registrationsWithMultiItems.has(reg.id)
  );

  const singleItemIds = Array.from(
    new Set(singleItemRegs.map((reg) => reg.purchaseItemId as number))
  );

  const singleItemMetaRows =
    singleItemIds.length > 0
      ? await db
          .select({
            id: eventPurchaseItems.id,
            name: eventPurchaseItems.name,
            amount: eventPurchaseItems.amount,
          })
          .from(eventPurchaseItems)
          .where(inArray(eventPurchaseItems.id, singleItemIds))
      : [];
  const singleItemMetaMap = new Map(
    singleItemMetaRows.map((row) => [row.id, row] as const)
  );

  // Fetch per-registration attendee counts only for the single-item registrations.
  const attendeeCountByRegistrationId = new Map<number, number>();
  if (singleItemRegs.length > 0) {
    const singleItemRegIds = singleItemRegs.map((r) => r.id);
    const perRegCounts = await db
      .select({
        registrationId: eventAttendees.registrationId,
        cnt: sql<number>`cast(count(*) as int)`.as("cnt"),
      })
      .from(eventAttendees)
      .where(inArray(eventAttendees.registrationId, singleItemRegIds))
      .groupBy(eventAttendees.registrationId);
    for (const row of perRegCounts) {
      attendeeCountByRegistrationId.set(row.registrationId, Number(row.cnt));
    }
  }

  for (const reg of regs) {
    if (reg.purchaseItemId == null) continue;
    if (registrationsWithMultiItems.has(reg.id)) continue;
    const meta = singleItemMetaMap.get(reg.purchaseItemId);
    if (!meta) continue;
    const attendeeCount = attendeeCountByRegistrationId.get(reg.id) ?? 0;
    const current = summaryMap.get(reg.purchaseItemId);
    if (current) {
      current.attendeeCount += attendeeCount;
      continue;
    }
    summaryMap.set(reg.purchaseItemId, {
      id: reg.purchaseItemId,
      name: meta.name,
      amount: meta.amount,
      attendeeCount,
    });
  }

  const purchaseItemSummary = Array.from(summaryMap.values()).sort(
    (a, b) => b.attendeeCount - a.attendeeCount || a.amount - b.amount
  );

  return NextResponse.json({
    roleCounts,
    totalAttendees,
    checkedInCount,
    paymentAmountTotals,
    purchaseItemSummary,
  });
}
