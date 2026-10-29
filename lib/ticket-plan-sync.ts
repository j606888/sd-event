import { createHash } from "node:crypto";
import { db } from "@/db";
import {
  eventCoupons,
  eventGroupExclusions,
  eventPriceTiers,
  eventPurchaseItemGroups,
  eventPurchaseItemPrices,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
  eventRegistrations,
  events,
} from "@/db/schema";
import { normalizeCouponCode } from "@/lib/coupon";
import { endOfDayFromDateInput } from "@/lib/pricing";
import { compileTicketPlan, type TicketPlan, type TicketPlanIds } from "@/lib/ticket-plan";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Conn = typeof db | Tx;

/**
 * 活動目前票券設定的指紋（時段／區塊／項目／時段價／互斥／折扣碼）。
 * 套用精靈時存一份；之後算出來不一樣 = 有人在進階模式手動改過，後台改以進階設定為準。
 * 已售數、折扣碼已用次數這類「會自己變」的欄位不算在內。
 */
export async function computeTicketFingerprint(conn: Conn, eventId: number): Promise<string> {
  const [tiers, groups, items, exclusions, coupons] = await Promise.all([
    conn
      .select({
        id: eventPriceTiers.id,
        name: eventPriceTiers.name,
        endsAt: eventPriceTiers.endsAt,
        sortOrder: eventPriceTiers.sortOrder,
      })
      .from(eventPriceTiers)
      .where(eq(eventPriceTiers.eventId, eventId))
      .orderBy(asc(eventPriceTiers.id)),
    conn
      .select({
        id: eventPurchaseItemGroups.id,
        title: eventPurchaseItemGroups.title,
        selectionMode: eventPurchaseItemGroups.selectionMode,
        required: eventPurchaseItemGroups.required,
        sortOrder: eventPurchaseItemGroups.sortOrder,
      })
      .from(eventPurchaseItemGroups)
      .where(eq(eventPurchaseItemGroups.eventId, eventId))
      .orderBy(asc(eventPurchaseItemGroups.id)),
    conn
      .select({
        id: eventPurchaseItems.id,
        name: eventPurchaseItems.name,
        amount: eventPurchaseItems.amount,
        groupId: eventPurchaseItems.groupId,
        seatCount: eventPurchaseItems.seatCount,
        description: eventPurchaseItems.description,
        minFlagged: eventPurchaseItems.minFlagged,
        hidden: eventPurchaseItems.hidden,
        sortOrder: eventPurchaseItems.sortOrder,
      })
      .from(eventPurchaseItems)
      .where(eq(eventPurchaseItems.eventId, eventId))
      .orderBy(asc(eventPurchaseItems.id)),
    conn
      .select({ a: eventGroupExclusions.groupAId, b: eventGroupExclusions.groupBId })
      .from(eventGroupExclusions)
      .where(eq(eventGroupExclusions.eventId, eventId))
      .orderBy(asc(eventGroupExclusions.groupAId), asc(eventGroupExclusions.groupBId)),
    conn
      .select({
        id: eventCoupons.id,
        code: eventCoupons.code,
        discountType: eventCoupons.discountType,
        value: eventCoupons.value,
        usageLimit: eventCoupons.usageLimit,
      })
      .from(eventCoupons)
      .where(eq(eventCoupons.eventId, eventId))
      .orderBy(asc(eventCoupons.id)),
  ]);
  const prices =
    items.length === 0
      ? []
      : await conn
          .select({
            itemId: eventPurchaseItemPrices.purchaseItemId,
            tierId: eventPurchaseItemPrices.tierId,
            amount: eventPurchaseItemPrices.amount,
            available: eventPurchaseItemPrices.available,
          })
          .from(eventPurchaseItemPrices)
          .where(
            inArray(
              eventPurchaseItemPrices.purchaseItemId,
              items.map((i) => i.id)
            )
          )
          .orderBy(asc(eventPurchaseItemPrices.purchaseItemId), asc(eventPurchaseItemPrices.tierId));

  const snapshot = JSON.stringify({
    tiers: tiers.map((t) => ({ ...t, endsAt: t.endsAt?.toISOString() ?? null })),
    groups,
    items,
    prices,
    exclusions,
    coupons,
  });
  return createHash("sha256").update(snapshot).digest("hex");
}

/** 各項目目前綁定的「未隱藏」報名數（新模式 join 列 + 舊單選模式），只回 > 0 的 */
async function activeRegistrationCounts(
  tx: Tx,
  eventId: number,
  itemIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (itemIds.length === 0) return counts;
  const multi = await tx
    .select({
      itemId: eventRegistrationPurchaseItems.purchaseItemId,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(eventRegistrationPurchaseItems)
    .innerJoin(
      eventRegistrations,
      eq(eventRegistrationPurchaseItems.registrationId, eventRegistrations.id)
    )
    .where(
      and(
        inArray(eventRegistrationPurchaseItems.purchaseItemId, itemIds),
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false)
      )
    )
    .groupBy(eventRegistrationPurchaseItems.purchaseItemId);
  const legacy = await tx
    .select({ itemId: eventRegistrations.purchaseItemId, n: sql<number>`cast(count(*) as int)` })
    .from(eventRegistrations)
    .where(
      and(
        inArray(eventRegistrations.purchaseItemId, itemIds),
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false),
        sql`not exists (select 1 from ${eventRegistrationPurchaseItems} where ${eventRegistrationPurchaseItems.registrationId} = ${eventRegistrations.id})`
      )
    )
    .groupBy(eventRegistrations.purchaseItemId);
  for (const row of [...multi, ...legacy]) {
    if (row.itemId == null) continue;
    counts.set(row.itemId, (counts.get(row.itemId) ?? 0) + Number(row.n));
  }
  return counts;
}

function readIds(stored: unknown): TicketPlanIds {
  const ids = (stored as { ids?: Partial<TicketPlanIds> } | null)?.ids;
  return {
    tiers: ids?.tiers ?? {},
    groups: ids?.groups ?? {},
    items: ids?.items ?? {},
    coupon: ids?.coupon,
  };
}

/**
 * 把精靈的答案套用到活動的票券設定（單一 transaction），回傳寫入 id 對照後的 plan。
 *
 * 精靈的答案是唯一依據：同一個 key 的時段／區塊／票券沿用原本那筆（已售出的票不會換 id），
 * 對不上的一律移除 —— 已有人買的票改成停售（隱藏）保留紀錄，其餘直接刪除。
 */
export async function applyTicketPlan(eventId: number, input: TicketPlan): Promise<TicketPlan> {
  const compiled = compileTicketPlan(input);

  return db.transaction(async (tx) => {
    // 鎖住活動列，同一活動同時套用兩次時後到的會等前一次完成
    const [event] = await tx
      .select({ ticketPlan: events.ticketPlan })
      .from(events)
      .where(eq(events.id, eventId))
      .for("update");
    const prev = readIds(event?.ticketPlan);
    const ids: TicketPlanIds = { tiers: {}, groups: {}, items: {} };
    const now = new Date();

    // ---- 票價時段 ----
    const existingTierIds = new Set(
      (
        await tx
          .select({ id: eventPriceTiers.id })
          .from(eventPriceTiers)
          .where(eq(eventPriceTiers.eventId, eventId))
      ).map((r) => r.id)
    );
    for (const tier of compiled.tiers) {
      const values = {
        name: tier.name.trim(),
        endsAt: endOfDayFromDateInput(tier.endsAt || null),
        sortOrder: tier.sortOrder,
        updatedAt: now,
      };
      const prevId = prev.tiers[tier.key];
      if (prevId != null && existingTierIds.has(prevId)) {
        await tx.update(eventPriceTiers).set(values).where(eq(eventPriceTiers.id, prevId));
        ids.tiers[tier.key] = prevId;
      } else {
        const [row] = await tx
          .insert(eventPriceTiers)
          .values({ eventId, ...values })
          .returning({ id: eventPriceTiers.id });
        ids.tiers[tier.key] = row.id;
      }
    }
    const keepTierIds = Object.values(ids.tiers);
    await tx
      .delete(eventPriceTiers)
      .where(
        and(
          eq(eventPriceTiers.eventId, eventId),
          keepTierIds.length > 0 ? notInArray(eventPriceTiers.id, keepTierIds) : undefined
        )
      );

    // ---- 票種區塊 ----
    const existingGroupIds = new Set(
      (
        await tx
          .select({ id: eventPurchaseItemGroups.id })
          .from(eventPurchaseItemGroups)
          .where(eq(eventPurchaseItemGroups.eventId, eventId))
      ).map((r) => r.id)
    );
    for (const group of compiled.groups) {
      const values = {
        title: group.title.trim(),
        selectionMode: group.selectionMode,
        required: group.required,
        sortOrder: group.sortOrder,
        updatedAt: now,
      };
      const prevId = prev.groups[group.key];
      if (prevId != null && existingGroupIds.has(prevId)) {
        await tx
          .update(eventPurchaseItemGroups)
          .set(values)
          .where(eq(eventPurchaseItemGroups.id, prevId));
        ids.groups[group.key] = prevId;
      } else {
        const [row] = await tx
          .insert(eventPurchaseItemGroups)
          .values({ eventId, ...values })
          .returning({ id: eventPurchaseItemGroups.id });
        ids.groups[group.key] = row.id;
      }
    }
    const keepGroupIds = Object.values(ids.groups);
    await tx
      .delete(eventPurchaseItemGroups)
      .where(
        and(
          eq(eventPurchaseItemGroups.eventId, eventId),
          keepGroupIds.length > 0 ? notInArray(eventPurchaseItemGroups.id, keepGroupIds) : undefined
        )
      );

    // ---- 購買項目與時段價 ----
    const existingItemIds = new Set(
      (
        await tx
          .select({ id: eventPurchaseItems.id })
          .from(eventPurchaseItems)
          .where(eq(eventPurchaseItems.eventId, eventId))
      ).map((r) => r.id)
    );
    for (const item of compiled.items) {
      const values = {
        name: item.name,
        amount: item.amount,
        description: item.description,
        groupId: ids.groups[item.groupKey],
        seatCount: item.seatCount,
        sortOrder: item.sortOrder,
        hidden: false,
        updatedAt: now,
      };
      const prevId = prev.items[item.key];
      let itemId: number;
      if (prevId != null && existingItemIds.has(prevId)) {
        await tx.update(eventPurchaseItems).set(values).where(eq(eventPurchaseItems.id, prevId));
        itemId = prevId;
      } else {
        const [row] = await tx
          .insert(eventPurchaseItems)
          .values({ eventId, ...values })
          .returning({ id: eventPurchaseItems.id });
        itemId = row.id;
      }
      ids.items[item.key] = itemId;
      await tx.delete(eventPurchaseItemPrices).where(eq(eventPurchaseItemPrices.purchaseItemId, itemId));
      if (item.prices.length > 0) {
        await tx.insert(eventPurchaseItemPrices).values(
          item.prices.map((p) => ({
            purchaseItemId: itemId,
            tierId: ids.tiers[p.tierKey],
            amount: p.available ? p.amount : 0,
            available: p.available,
          }))
        );
      }
    }
    const keepItemIds = new Set(Object.values(ids.items));
    const orphanIds = [...existingItemIds].filter((id) => !keepItemIds.has(id));
    if (orphanIds.length > 0) {
      const sold = await activeRegistrationCounts(tx, eventId, orphanIds);
      const soldIds = orphanIds.filter((id) => (sold.get(id) ?? 0) > 0);
      const unsoldIds = orphanIds.filter((id) => !((sold.get(id) ?? 0) > 0));
      if (soldIds.length > 0) {
        await tx
          .update(eventPurchaseItems)
          .set({ hidden: true, updatedAt: now })
          .where(inArray(eventPurchaseItems.id, soldIds));
      }
      if (unsoldIds.length > 0) {
        await tx.delete(eventPurchaseItems).where(inArray(eventPurchaseItems.id, unsoldIds));
      }
    }

    // ---- 區塊互斥（整批重寫，a < b） ----
    await tx.delete(eventGroupExclusions).where(eq(eventGroupExclusions.eventId, eventId));
    if (compiled.exclusions.length > 0) {
      await tx.insert(eventGroupExclusions).values(
        compiled.exclusions.map(([a, b]) => {
          const ga = ids.groups[a];
          const gb = ids.groups[b];
          return { eventId, groupAId: Math.min(ga, gb), groupBId: Math.max(ga, gb) };
        })
      );
    }

    // ---- 折扣碼：只管精靈建的那一張（同代碼的既有折扣碼直接沿用） ----
    const prevCoupon =
      prev.coupon != null
        ? (
            await tx
              .select()
              .from(eventCoupons)
              .where(and(eq(eventCoupons.id, prev.coupon), eq(eventCoupons.eventId, eventId)))
          )[0]
        : undefined;
    if (compiled.coupon) {
      const code = normalizeCouponCode(compiled.coupon.code);
      const [sameCode] = await tx
        .select()
        .from(eventCoupons)
        .where(and(eq(eventCoupons.eventId, eventId), eq(eventCoupons.code, code)));
      const target = sameCode ?? prevCoupon;
      const usageLimit =
        compiled.coupon.usageLimit == null
          ? null
          : Math.max(compiled.coupon.usageLimit, target?.usedCount ?? 0);
      const values = {
        code,
        discountType: "percent" as const,
        value: compiled.coupon.percentOff,
        usageLimit,
        updatedAt: now,
      };
      if (target) {
        await tx.update(eventCoupons).set(values).where(eq(eventCoupons.id, target.id));
        ids.coupon = target.id;
        if (prevCoupon && prevCoupon.id !== target.id) {
          await tx.delete(eventCoupons).where(eq(eventCoupons.id, prevCoupon.id));
        }
      } else {
        const [row] = await tx
          .insert(eventCoupons)
          .values({ eventId, ...values })
          .returning({ id: eventCoupons.id });
        ids.coupon = row.id;
      }
    } else if (prevCoupon) {
      await tx.delete(eventCoupons).where(eq(eventCoupons.id, prevCoupon.id));
    }

    const plan: TicketPlan = { ...input, ids };
    await tx
      .update(events)
      .set({
        ticketPlan: plan,
        ticketPlanFingerprint: await computeTicketFingerprint(tx, eventId),
        // 有區塊時金額一律由伺服器計算
        autoCalcAmount: true,
        updatedAt: now,
      })
      .where(eq(events.id, eventId));
    return plan;
  });
}
