/**
 * 票價時段（Price Tier）共用定價邏輯。
 *
 * 伺服器端共用（公開活動 route 顯示用、報名建立 route 收費快照用），
 * 一律以「伺服器時間」解析，避免 client 時鐘造成顯示價與收費價不一致。
 */

export type PriceTier = {
  id: number;
  name: string;
  /** 此時段截止時間（含）；fallback 段為 null = 永不過期 */
  endsAt: Date | string | null;
  sortOrder: number;
};

export type ItemPrice = {
  tierId: number;
  amount: number;
};

function toTime(value: Date | string | null): number | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * 依 sortOrder 升冪，回傳第一個「尚未截止」的時段：
 *   - endsAt 為 null（fallback 段）或 now <= endsAt 即視為有效。
 * 若全部已截止，退回最後一段；無任何時段則回傳 null。
 */
export function resolveActiveTier<T extends PriceTier>(
  tiers: T[],
  now: Date
): T | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const nowMs = now.getTime();
  for (const tier of sorted) {
    const endMs = toTime(tier.endsAt);
    if (endMs == null || nowMs <= endMs) return tier;
  }
  return sorted[sorted.length - 1];
}

/**
 * 解析某項目在指定時段的單價：
 *   - 找到該 tier 的列價就用它，否則退回項目本身的 fallback `itemAmount`。
 */
export function getItemUnitPrice(
  itemAmount: number,
  itemPrices: ItemPrice[],
  tierId: number | null
): number {
  if (tierId == null) return itemAmount;
  const match = itemPrices.find((p) => p.tierId === tierId);
  return match ? match.amount : itemAmount;
}

/**
 * 把「只選日期」的截止輸入轉成當地當日 23:59:59.999 的 Date。
 * 接受 "YYYY-MM-DD"（date input）或完整 ISO 字串；空值回傳 null（fallback 段）。
 */
export function endOfDayFromDateInput(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  // 純日期：以當地時間建構當日末
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const d = dateOnly ? new Date(`${trimmed}T23:59:59.999`) : new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}
