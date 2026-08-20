/**
 * 一次性修正 event_price_tiers.ends_at 的時區偏移。
 *
 * 背景：舊版 `endOfDayFromDateInput` 用 `new Date("YYYY-MM-DDT23:59:59.999")`
 * 解析截止日，字串沒有時區後綴，會採用執行環境的時區。寫入路徑是 API route，
 * 在 Vercel 上跑在 UTC，所以組織者填的 8/20 被存成 2026-08-20T23:59:59.999Z
 * ——即台北時間 8/21 07:59，早鳥價多活了 8 小時。
 *
 * 修正規則：只挑「UTC 時間部分正好是 23:59:59.999」的列（這些必定出自 buggy 的
 * server 路徑），其 UTC 日期部分就是組織者當初填的日期，重新錨定為該日期的
 * 台北 23:59:59.999（= 15:59:59.999Z）。其餘列一律跳過，所以重跑安全、不會累積位移。
 *
 * Usage:
 *   npm run fix-tier-tz                  # local，dry-run
 *   npm run fix-tier-tz -- --apply       # local，實際寫入
 *   npm run fix-tier-tz:prod             # production，dry-run
 *   npm run fix-tier-tz:prod -- --apply  # production，實際寫入
 */
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { eventPriceTiers } from "../db/schema";
import { TAIPEI_OFFSET } from "../lib/format-event-date";

/** buggy 寫入的特徵：UTC 時間部分為 23:59:59.999 */
function isBuggyUtcEndOfDay(d: Date): boolean {
  return (
    d.getUTCHours() === 23 &&
    d.getUTCMinutes() === 59 &&
    d.getUTCSeconds() === 59 &&
    d.getUTCMilliseconds() === 999
  );
}

/** 取 UTC 日曆日期（即組織者當初在 date input 填的字串），重錨為台北當日末 */
function reanchorToTaipei(d: Date): Date {
  const ymd = d.toISOString().slice(0, 10);
  return new Date(`${ymd}T23:59:59.999${TAIPEI_OFFSET}`);
}

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = await db
    .select({
      id: eventPriceTiers.id,
      eventId: eventPriceTiers.eventId,
      name: eventPriceTiers.name,
      endsAt: eventPriceTiers.endsAt,
    })
    .from(eventPriceTiers)
    .where(isNotNull(eventPriceTiers.endsAt));

  console.log(`\n${apply ? "APPLY" : "DRY-RUN"} — 共 ${rows.length} 筆有截止日的時段\n`);

  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    const before = row.endsAt as Date | null;
    if (!before) continue;

    if (!isBuggyUtcEndOfDay(before)) {
      skipped++;
      console.log(
        `  skip  #${row.id}  event ${row.eventId}  ${row.name}  ${before.toISOString()}`
      );
      continue;
    }

    const after = reanchorToTaipei(before);
    fixed++;
    console.log(
      `  fix   #${row.id}  event ${row.eventId}  ${row.name}\n` +
        `        ${before.toISOString()}  ->  ${after.toISOString()}  (台北 ${row.endsAt!.toISOString().slice(0, 10)} 23:59)`
    );

    if (apply) {
      await db
        .update(eventPriceTiers)
        .set({ endsAt: after, updatedAt: new Date() })
        .where(eq(eventPriceTiers.id, row.id));
    }
  }

  console.log(
    `\n${apply ? "已修正" : "待修正"} ${fixed} 筆，跳過 ${skipped} 筆。` +
      (apply ? "\n" : "\n加上 -- --apply 才會實際寫入。\n")
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
