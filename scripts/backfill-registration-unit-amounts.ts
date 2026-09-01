/**
 * 一次性補寫舊單選報名的單價快照（event_registration_purchase_items）。
 *
 * 背景：報名建立時只有「多選 / 群組」模式會寫 event_registration_purchase_items，
 * 單選報名只在 event_registrations.purchase_item_id 留下票券 id，沒有 unit_amount。
 * 統計因此退回 event_purchase_items.amount（= fallback 段，通常是現場價），
 * 讓早鳥報名的收入被高估（例：21 人早鳥 250 被算成 21 × 300 = 6300）。
 *
 * 讀取端已改成用 created_at 回推當時生效的時段價，畫面即刻正確；但那是「推導」，
 * 之後若調整時段截止時間或時段價，歷史數字會跟著漂移。這支 script 把推導出來的
 * 單價寫死成快照，讓歷史金額固定下來。
 *
 * 只處理「有 purchase_item_id、且在 join table 完全沒有列」的報名，
 * 已經有快照的一律跳過，所以重跑安全、不會重複插入。
 *
 * Usage:
 *   npm run backfill-unit-amounts                  # local，dry-run
 *   npm run backfill-unit-amounts -- --apply       # local，實際寫入
 *   npm run backfill-unit-amounts:prod             # production，dry-run
 *   npm run backfill-unit-amounts:prod -- --apply  # production，實際寫入
 */
import { asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  eventPriceTiers,
  eventPurchaseItemPrices,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
  eventRegistrations,
} from "../db/schema";
import { createHistoricalPriceResolver } from "../lib/registration-pricing";

async function main() {
  const apply = process.argv.includes("--apply");

  // 舊單選報名：有 purchase_item_id，但 join table 一列都沒有
  const rows = await db
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      registrationKey: eventRegistrations.registrationKey,
      purchaseItemId: eventRegistrations.purchaseItemId,
      createdAt: eventRegistrations.createdAt,
    })
    .from(eventRegistrations)
    .where(
      sql`${isNotNull(eventRegistrations.purchaseItemId)} and not exists (
        select 1 from ${eventRegistrationPurchaseItems}
        where ${eventRegistrationPurchaseItems.registrationId} = ${eventRegistrations.id}
      )`
    )
    .orderBy(asc(eventRegistrations.id));

  console.log(`\n${apply ? "APPLY" : "DRY-RUN"} — 共 ${rows.length} 筆待補快照的單選報名\n`);

  if (rows.length === 0) {
    console.log("沒有需要處理的報名。\n");
    process.exit(0);
  }

  // 逐活動建 resolver：時段與時段價都是 event-scoped
  const eventIds = Array.from(new Set(rows.map((r) => r.eventId)));
  const resolverByEvent = new Map<
    number,
    ReturnType<typeof createHistoricalPriceResolver>
  >();
  for (const eventId of eventIds) {
    const [tiers, priceRows] = await Promise.all([
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
    ]);
    resolverByEvent.set(eventId, createHistoricalPriceResolver(tiers, priceRows));
  }

  const itemIds = Array.from(new Set(rows.map((r) => r.purchaseItemId!)));
  const items = await db
    .select({
      id: eventPurchaseItems.id,
      name: eventPurchaseItems.name,
      amount: eventPurchaseItems.amount,
    })
    .from(eventPurchaseItems)
    .where(inArray(eventPurchaseItems.id, itemIds));
  const itemById = new Map(items.map((i) => [i.id, i] as const));

  let written = 0;
  let skipped = 0;

  for (const row of rows) {
    const item = itemById.get(row.purchaseItemId!);
    if (!item) {
      skipped++;
      console.log(`  skip  reg #${row.id}  票券 ${row.purchaseItemId} 已刪除`);
      continue;
    }

    const { amount, tierName } = resolverByEvent.get(row.eventId)!(
      item.id,
      item.amount,
      row.createdAt
    );

    written++;
    const marker = amount === item.amount ? " " : "*";
    console.log(
      `  fill${marker} reg #${row.id}  event ${row.eventId}  ${item.name}  ` +
        `${tierName ?? "無時段"}  單價 ${amount}（項目定價 ${item.amount}）`
    );

    if (apply) {
      await db.insert(eventRegistrationPurchaseItems).values({
        registrationId: row.id,
        purchaseItemId: item.id,
        quantity: 1,
        unitAmount: amount,
        tierName,
      });
    }
  }

  console.log(
    `\n${apply ? "已補寫" : "待補寫"} ${written} 筆，跳過 ${skipped} 筆。` +
      `（* = 單價與項目定價不同，正是這次要修的資料）` +
      (apply ? "\n" : "\n加上 -- --apply 才會實際寫入。\n")
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
