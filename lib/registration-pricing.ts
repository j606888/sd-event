/**
 * 報名建立共用邏輯：票種群組規則驗證 + 時段單價解析。
 *
 * 由公開報名 route 與現場報名（walk-in）route 共用，確保兩條路徑的
 * 群組規則與收費快照完全一致。純函式，輸入皆為已查出的 DB 列。
 */

import {
  resolveActiveTier,
  getItemUnitPrice,
  type PriceTier,
  type ItemPrice,
} from "./pricing";

export type GroupRow = {
  id: number;
  title: string;
  selectionMode: string; // "single" | "multiple"
  required: boolean;
};

export type ItemRow = {
  id: number;
  groupId: number | null;
};

export type ExclusionRow = {
  groupAId: number;
  groupBId: number;
};

/**
 * 依群組規則驗證選取項目。回傳錯誤訊息字串，或 null 表通過。
 *   - 每個選取項目都必須屬於本活動的某個群組
 *   - selectionMode="single" → 該群組最多選一項
 *   - required → single 必須恰選一項、multiple 至少一項
 *   - 互斥配對的兩群組不可同時有選取
 */
export function validateGroupSelection(
  groups: GroupRow[],
  items: ItemRow[],
  selectedIds: number[],
  exclusions: ExclusionRow[]
): string | null {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const itemById = new Map(items.map((it) => [it.id, it]));

  for (const id of selectedIds) {
    const it = itemById.get(id);
    if (!it || it.groupId == null || !groupById.has(it.groupId)) {
      return "無效的購買項目";
    }
  }

  const countByGroup = new Map<number, number>();
  for (const id of selectedIds) {
    const gid = itemById.get(id)!.groupId!;
    countByGroup.set(gid, (countByGroup.get(gid) ?? 0) + 1);
  }

  for (const g of groups) {
    const c = countByGroup.get(g.id) ?? 0;
    if (g.selectionMode === "single" && c > 1) {
      return `「${g.title}」僅能擇一`;
    }
    if (g.required) {
      if (g.selectionMode === "single" && c !== 1) {
        return `請於「${g.title}」選擇一項`;
      }
      if (g.selectionMode === "multiple" && c < 1) {
        return `請於「${g.title}」至少選擇一項`;
      }
    }
  }

  for (const { groupAId, groupBId } of exclusions) {
    if ((countByGroup.get(groupAId) ?? 0) > 0 && (countByGroup.get(groupBId) ?? 0) > 0) {
      const a = groupById.get(groupAId);
      const b = groupById.get(groupBId);
      return `「${a?.title ?? ""}」與「${b?.title ?? ""}」不可同時選擇`;
    }
  }

  return null;
}

/**
 * 解析選取項目於「指定時間」生效時段的單價快照。
 * 回傳當下時段與每個項目的單價（找不到列價則退回項目 fallback amount）。
 */
export function resolveUnitPrices(
  selectedItems: { id: number; amount: number }[],
  tiers: PriceTier[],
  priceRows: { purchaseItemId: number; tierId: number; amount: number }[],
  now: Date
): { activeTier: PriceTier | null; unitPriceById: Map<number, number> } {
  const activeTier = resolveActiveTier(tiers, now);

  const pricesByItem = new Map<number, ItemPrice[]>();
  for (const row of priceRows) {
    const arr = pricesByItem.get(row.purchaseItemId) ?? [];
    arr.push({ tierId: row.tierId, amount: row.amount });
    pricesByItem.set(row.purchaseItemId, arr);
  }

  const unitPriceById = new Map<number, number>();
  for (const item of selectedItems) {
    unitPriceById.set(
      item.id,
      getItemUnitPrice(item.amount, pricesByItem.get(item.id) ?? [], activeTier?.id ?? null)
    );
  }

  return { activeTier, unitPriceById };
}

/**
 * 舊資料回推用：建立「以報名當下時間解析單價」的查詢器。
 *
 * 單選（舊制）報名沒有寫入 `eventRegistrationPurchaseItems.unitAmount` 快照，
 * 直接拿 `eventPurchaseItems.amount` 會取到 fallback 段（現場價），
 * 使早鳥報名的統計金額偏高。改以 `createdAt` 回推當時生效的時段價。
 *
 * 索引只建一次，供多筆報名重複查詢。
 */
export function createHistoricalPriceResolver(
  tiers: PriceTier[],
  priceRows: { purchaseItemId: number; tierId: number; amount: number }[]
): (
  itemId: number,
  itemAmount: number,
  at: Date | string | null
) => { amount: number; tierName: string | null } {
  const pricesByItem = new Map<number, ItemPrice[]>();
  for (const row of priceRows) {
    const arr = pricesByItem.get(row.purchaseItemId) ?? [];
    arr.push({ tierId: row.tierId, amount: row.amount });
    pricesByItem.set(row.purchaseItemId, arr);
  }

  // 同一時間點只解析一次時段
  const tierByTime = new Map<number, PriceTier | null>();

  return (itemId, itemAmount, at) => {
    const d = at == null ? null : at instanceof Date ? at : new Date(at);
    const ms = d?.getTime();
    if (ms == null || Number.isNaN(ms)) {
      return { amount: itemAmount, tierName: null };
    }
    let tier = tierByTime.get(ms);
    if (tier === undefined) {
      tier = resolveActiveTier(tiers, new Date(ms));
      tierByTime.set(ms, tier);
    }
    return {
      amount: getItemUnitPrice(
        itemAmount,
        pricesByItem.get(itemId) ?? [],
        tier?.id ?? null
      ),
      tierName: tier?.name ?? null,
    };
  };
}

/**
 * 把一筆報名的實際成交價按各項目定價比例拆回各項目，並保證整數且加總 == total。
 * 除不盡的餘數用最大餘數法補給小數部分最大的項目，避免每筆都少個位數。
 * weights 全為 0（例如免費項目）時回傳全 0，不做無意義的攤分。
 */
export function distributeAmount(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weights.length === 0) return [];
  if (weightSum <= 0 || total <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (total * w) / weightSum);
  const result = exact.map(Math.floor);
  let remainder = total - result.reduce((sum, v) => sum + v, 0);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < byFraction.length && remainder > 0; i++) {
    result[byFraction[i].index]++;
    remainder--;
  }
  return result;
}
