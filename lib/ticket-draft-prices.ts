/**
 * 票券設定表單的時段價 draft 重新對應（純函式，方便單元測試）。
 *
 * 表單裡的時段價有兩種指涉方式：已存檔的時段用 `tierId`，尚未存檔的草稿時段用
 * 陣列位置 `tierDraftIndex`。時段一旦增刪，草稿的位置就會整體位移，這裡把
 * 「哪些價格該刪」「剩下的該怎麼位移」集中處理。
 */

export type TierPriceRef = {
  tierId?: number;
  tierDraftIndex?: number;
  amount: number;
};

/**
 * 刪掉第 `index` 段之後，重新對應某項目的時段價。
 *
 * `removedTierId` 有值（已存檔的時段）就用 id 比對，否則用草稿位置比對。
 * 兩個條件**不能並列**：create 模式下 `p.tierId !== removedTierId` 會是
 * `undefined !== undefined`（false），會把該項目的所有時段價一起濾掉。
 */
export function remapPricesAfterTierRemoval(
  prices: TierPriceRef[],
  index: number,
  removedTierId?: number | null
): TierPriceRef[] {
  const isRemoved = (p: TierPriceRef) =>
    removedTierId != null ? p.tierId === removedTierId : p.tierDraftIndex === index;

  return prices
    .filter((p) => !isRemoved(p))
    .map((p) =>
      p.tierDraftIndex != null && p.tierDraftIndex > index
        ? { ...p, tierDraftIndex: p.tierDraftIndex - 1 }
        : p
    );
}

/** 在第 `index` 段插入新時段後，把該位置之後的草稿時段價往後移一格 */
export function shiftPricesAfterTierInsert(
  prices: TierPriceRef[],
  index: number
): TierPriceRef[] {
  return prices.map((p) =>
    p.tierDraftIndex != null && p.tierDraftIndex >= index
      ? { ...p, tierDraftIndex: p.tierDraftIndex + 1 }
      : p
  );
}
