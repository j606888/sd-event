import { and, eq, exists, notExists, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrationPurchaseItems, eventRegistrations } from "@/db/schema";

/** 解析 `purchaseItemId` query param；非正整數視為未篩選。 */
export function parsePurchaseItemIdParam(raw: string | null): number | null {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * 「報名了某個項目」的 where 條件（列表 API 與 CSV 匯出共用）。
 * 新制走 join table；舊制單選報名沒有 join 列，退回 registration.purchaseItemId
 * （與 stats route 的判斷一致，篩出來的筆數才會對得上統計）。
 */
export function registrationHasPurchaseItem(purchaseItemId: number): SQL {
  const joinRows = (extra?: SQL) =>
    db
      .select({ one: eventRegistrationPurchaseItems.id })
      .from(eventRegistrationPurchaseItems)
      .where(
        and(
          eq(eventRegistrationPurchaseItems.registrationId, eventRegistrations.id),
          extra
        )
      );

  return or(
    exists(joinRows(eq(eventRegistrationPurchaseItems.purchaseItemId, purchaseItemId))),
    and(
      notExists(joinRows()),
      eq(eventRegistrations.purchaseItemId, purchaseItemId)
    )
  )!;
}
