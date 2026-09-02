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
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray, and, asc, count, sql } from "drizzle-orm";
import {
  createHistoricalPriceResolver,
  distributeAmount,
} from "@/lib/registration-pricing";

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
      createdAt: eventRegistrations.createdAt,
      totalAmount: eventRegistrations.totalAmount,
      discountAmount: eventRegistrations.discountAmount,
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
      paymentCounts: {
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
    if (row.role in roleCounts) {
      roleCounts[row.role] = Number(row.total);
    }
  }

  // Query 2: Payment amount totals + registration counts via GROUP BY.
  // 筆數是「報名筆」而非人數 —— 付款狀態掛在 registration 上。
  const paymentStats = await db
    .select({
      paymentStatus: eventRegistrations.paymentStatus,
      total: sql<number>`cast(sum(${eventRegistrations.totalAmount}) as int)`,
      count: count(),
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
  const paymentCounts = { confirmed: 0, reported: 0, pending: 0 };
  for (const row of paymentStats) {
    if (row.paymentStatus === "confirmed") {
      paymentAmountTotals.confirmed = Number(row.total);
      paymentCounts.confirmed = Number(row.count);
    } else if (row.paymentStatus === "reported") {
      paymentAmountTotals.reported = Number(row.total);
      paymentCounts.reported = Number(row.count);
    } else {
      // Treat pending/rejected/unknown as receivable-uncollected bucket.
      // 被退回（rejected）的人會被引導「重新回報」，所以仍算應收，不是壞帳。
      paymentAmountTotals.pending += Number(row.total);
      paymentCounts.pending += Number(row.count);
    }
  }

  // Query 3: 報名項目統計。
  //
  // 逐筆報名計算，最後讓每筆的項目金額加總 == 該筆實際成交價（totalAmount + 折抵），
  // 這樣本區塊的總計必定與上方「款項」對得起來。單價來源依序：
  //   1. eventRegistrationPurchaseItems.unitAmount（報名當下的時段價快照）
  //   2. 舊資料沒有快照時，用 createdAt 回推當時生效的時段價
  //   3. 都拿不到才退回項目定價
  // 現場報名若由主辦覆寫金額（walk-in 的 totalAmount），差額會按各項目定價比例攤回，
  // 因此覆寫後的收入也會反映在這裡。
  const [regItemRows, allItems, tiers, priceRows, perRegCounts] = await Promise.all([
    db
      .select({
        registrationId: eventRegistrationPurchaseItems.registrationId,
        purchaseItemId: eventRegistrationPurchaseItems.purchaseItemId,
        quantity: eventRegistrationPurchaseItems.quantity,
        unitAmount: eventRegistrationPurchaseItems.unitAmount,
      })
      .from(eventRegistrationPurchaseItems)
      .where(inArray(eventRegistrationPurchaseItems.registrationId, registrationIds)),
    db
      .select({
        id: eventPurchaseItems.id,
        name: eventPurchaseItems.name,
        amount: eventPurchaseItems.amount,
      })
      .from(eventPurchaseItems)
      .where(eq(eventPurchaseItems.eventId, eventId)),
    db
      .select()
      .from(eventPriceTiers)
      .where(eq(eventPriceTiers.eventId, eventId))
      .orderBy(asc(eventPriceTiers.sortOrder)),
    db
      .select({
        purchaseItemId: eventPurchaseItemPrices.purchaseItemId,
        tierId: eventPurchaseItemPrices.tierId,
        amount: eventPurchaseItemPrices.amount,
      })
      .from(eventPurchaseItemPrices)
      .innerJoin(
        eventPurchaseItems,
        eq(eventPurchaseItemPrices.purchaseItemId, eventPurchaseItems.id)
      )
      .where(eq(eventPurchaseItems.eventId, eventId)),
    db
      .select({
        registrationId: eventAttendees.registrationId,
        cnt: sql<number>`cast(count(*) as int)`.as("cnt"),
      })
      .from(eventAttendees)
      .where(inArray(eventAttendees.registrationId, registrationIds))
      .groupBy(eventAttendees.registrationId),
  ]);

  const itemMetaById = new Map(allItems.map((i) => [i.id, i] as const));
  const attendeeCountByRegistrationId = new Map(
    perRegCounts.map((r) => [r.registrationId, Number(r.cnt)] as const)
  );
  const resolveHistoricalPrice = createHistoricalPriceResolver(tiers, priceRows);

  const regItemsByRegistrationId = new Map<
    number,
    { purchaseItemId: number; quantity: number; unitAmount: number | null }[]
  >();
  for (const row of regItemRows) {
    const list = regItemsByRegistrationId.get(row.registrationId) ?? [];
    list.push({
      purchaseItemId: row.purchaseItemId,
      quantity: row.quantity,
      unitAmount: row.unitAmount,
    });
    regItemsByRegistrationId.set(row.registrationId, list);
  }

  const summaryMap = new Map<
    number,
    { id: number; name: string; amount: number; attendeeCount: number; revenue: number }
  >();

  for (const reg of regs) {
    const attendeeCount = attendeeCountByRegistrationId.get(reg.id) ?? 0;

    // 新制走 join table；舊制單選報名沒有 join 列，退回 registration.purchaseItemId
    const items =
      regItemsByRegistrationId.get(reg.id) ??
      (reg.purchaseItemId != null
        ? [{ purchaseItemId: reg.purchaseItemId, quantity: 1, unitAmount: null }]
        : []);

    const lines = items.flatMap((item) => {
      const meta = itemMetaById.get(item.purchaseItemId);
      if (!meta) return [];
      const unitAmount =
        item.unitAmount ??
        resolveHistoricalPrice(meta.id, meta.amount, reg.createdAt).amount;
      const units = attendeeCount * item.quantity;
      return [{ meta, units, listSubtotal: units * unitAmount }];
    });

    // 各筆的實際成交價（加回折扣碼折抵，與本區塊標題一致）
    const charged = reg.totalAmount + reg.discountAmount;
    const revenues = distributeAmount(
      charged,
      lines.map((l) => l.listSubtotal)
    );

    lines.forEach((line, index) => {
      const current = summaryMap.get(line.meta.id);
      if (current) {
        current.attendeeCount += line.units;
        current.revenue += revenues[index];
        return;
      }
      summaryMap.set(line.meta.id, {
        id: line.meta.id,
        name: line.meta.name,
        amount: line.meta.amount,
        attendeeCount: line.units,
        revenue: revenues[index],
      });
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
    paymentCounts,
    purchaseItemSummary,
  });
}
