/**
 * 組合價（依勾選數量計價）共用邏輯。
 *
 * 可複選的票券區塊開啟 `comboPricing` 後，價格看「勾了幾項」而不是各票單價：
 * 「選 1 項 500、選 2 項 900、全選 1,200（Full Pass）」。某一列可設「附贈」其他區塊的一張票。
 *
 * 公開報名 route、現場報名 route、報名表單 hook、後台預覽共用同一份計算，確保顯示價 = 收費價。
 * 純函式、不碰 DB，前後端都可以 import。
 *
 * 報名紀錄仍逐張記下勾了哪幾項（報到、各項人數統計照常）：組合總價平均拆到各項的
 * unitAmount（整數、加總不變），附贈票 unitAmount = 0。
 */
import { distributeAmount } from "./registration-pricing";

export type ComboRow = {
  /** 勾選數量 */
  count: number;
  /** 顯示名稱（選填，如「Full Pass」） */
  title: string | null;
  /** 此數量的總價（已依當下時段解析） */
  amount: number;
  /** 達到此數量時附贈的票；null = 無 */
  giftItemId: number | null;
};

export type ComboGroupInput = {
  id: number;
  comboPricing?: boolean | null;
  combos?: ComboRow[] | null;
};

export type PriceableItem = {
  id: number;
  groupId?: number | null;
  /** 一般計價下的單價（已依當下時段解析） */
  unitPrice: number;
  seatCount?: number | null;
};

export type PricedLine = {
  itemId: number;
  unitPrice: number;
  seatCount?: number | null;
  /** 組合價名稱快照；非組合價或該列未命名為 null */
  comboTitle: string | null;
  isGift: boolean;
};

export type AppliedCombo = {
  groupId: number;
  count: number;
  title: string | null;
  amount: number;
  giftItemId: number | null;
};

export function isComboGroup(group: ComboGroupInput): boolean {
  return !!group.comboPricing;
}

/** 某組合價群組「選 n 項」的那一列；沒有（未設定）回傳 null */
export function comboFor(group: ComboGroupInput, count: number): ComboRow | null {
  if (!isComboGroup(group) || count <= 0) return null;
  return group.combos?.find((c) => c.count === count) ?? null;
}

/** 依數量升冪排列的價目表 */
export function comboLadder(group: ComboGroupInput): ComboRow[] {
  return [...(group.combos ?? [])].sort((a, b) => a.count - b.count);
}

/**
 * 依群組規則計算每個選取項目（含附贈）的收費單價。
 *   - 非組合價群組：沿用項目單價。
 *   - 組合價群組勾了 n 項：「選 n 項」的總價平均拆到這 n 項；找不到該列時退回各項單價加總。
 *   - 該列有附贈：附贈票單價 0、標為 isGift；報名者自己也勾了那張票時同樣改為 0（不重複收費）。
 * 組合價群組內的票一律以一般票（每位參加者一份）計價。
 */
export function priceSelection(
  groups: ComboGroupInput[],
  itemsById: Map<number, PriceableItem>,
  selectedIds: number[]
): { lines: PricedLine[]; appliedCombos: AppliedCombo[] } {
  const uniqueIds = Array.from(new Set(selectedIds)).filter((id) => itemsById.has(id));
  const lines: PricedLine[] = uniqueIds.map((id) => {
    const item = itemsById.get(id)!;
    return {
      itemId: id,
      unitPrice: item.unitPrice,
      seatCount: item.seatCount,
      comboTitle: null,
      isGift: false,
    };
  });
  const lineById = new Map(lines.map((l) => [l.itemId, l]));
  const appliedCombos: AppliedCombo[] = [];

  for (const group of groups) {
    if (!isComboGroup(group)) continue;
    const ids = uniqueIds.filter((id) => itemsById.get(id)!.groupId === group.id);
    const row = comboFor(group, ids.length);
    if (!row) continue;

    const shares = distributeAmount(row.amount, ids.map(() => 1));
    ids.forEach((id, i) => {
      const line = lineById.get(id)!;
      line.unitPrice = shares[i];
      line.seatCount = 1;
      line.comboTitle = row.title || null;
    });

    const gift = row.giftItemId != null ? itemsById.get(row.giftItemId) : undefined;
    if (gift && gift.groupId !== group.id) {
      const existing = lineById.get(gift.id);
      if (existing) {
        existing.unitPrice = 0;
        existing.isGift = true;
        existing.comboTitle = row.title || null;
      } else {
        const line: PricedLine = {
          itemId: gift.id,
          unitPrice: 0,
          seatCount: 1,
          comboTitle: row.title || null,
          isGift: true,
        };
        lines.push(line);
        lineById.set(gift.id, line);
      }
    }
    appliedCombos.push({
      groupId: group.id,
      count: row.count,
      title: row.title || null,
      amount: row.amount,
      giftItemId: gift && gift.groupId !== group.id ? gift.id : null,
    });
  }

  return { lines, appliedCombos };
}

/**
 * 目前選取下被附贈的票 id（報名頁顯示「已含」並鎖住勾選用）。
 */
export function giftedItemIds(
  groups: ComboGroupInput[],
  itemsById: Map<number, PriceableItem>,
  selectedIds: number[]
): Set<number> {
  const { lines } = priceSelection(groups, itemsById, selectedIds);
  return new Set(lines.filter((l) => l.isGift).map((l) => l.itemId));
}

/**
 * 報名明細顯示：同一個組合名稱的項目合併成一行「Full Pass（A、B、C）」，金額相加。
 * 沒有組合名稱的項目原樣保留。合併後的項目放在該組第一項的位置。
 */
export function mergeComboItems<
  T extends { name: string; amount?: number | null; comboTitle?: string | null },
>(
  items: T[],
  format: (title: string, names: string[]) => string = (title, names) =>
    `${title}（${names.join("、")}）`
): T[] {
  const result: T[] = [];
  const byTitle = new Map<string, { index: number; names: string[]; amount: number | null }>();
  for (const item of items) {
    const title = item.comboTitle;
    if (!title) {
      result.push(item);
      continue;
    }
    const entry = byTitle.get(title);
    if (entry) {
      entry.names.push(item.name);
      if (entry.amount != null && item.amount != null) entry.amount += item.amount;
      continue;
    }
    byTitle.set(title, { index: result.length, names: [item.name], amount: item.amount ?? null });
    result.push(item);
  }
  for (const [title, entry] of byTitle) {
    result[entry.index] = {
      ...result[entry.index],
      name: format(title, entry.names),
      amount: entry.amount,
    };
  }
  return result;
}

/** 組合價設定錯誤：code 對應 eventApiErrors.combos.<code> */
export type ComboConfigError =
  | { code: "notMultiple" }
  | { code: "noItems" }
  | { code: "bundleItem"; values: { item: string } }
  | { code: "missingCount"; values: { count: number } }
  | { code: "invalidAmount"; values: { count: number } }
  | { code: "invalidGift"; values: { count: number } };

/**
 * 驗證要儲存的組合價設定：每個數量 1..itemCount 都要有一列、金額為非負整數、
 * 附贈票必須是本活動其他區塊的票。
 */
export function validateComboConfig(input: {
  selectionMode: string;
  /** 群組內（未隱藏）的票 */
  items: { id: number; name: string; seatCount?: number | null }[];
  combos: {
    count: number;
    amount: number;
    prices: { tierId: number; amount: number }[];
    giftItemId: number | null;
  }[];
  /** 本活動其他區塊可當附贈的票 id */
  giftableItemIds: Set<number>;
}): ComboConfigError | null {
  if (input.selectionMode !== "multiple") return { code: "notMultiple" };
  if (input.items.length === 0) return { code: "noItems" };
  const bundle = input.items.find((i) => (i.seatCount ?? 1) > 1);
  if (bundle) return { code: "bundleItem", values: { item: bundle.name } };

  const isMoney = (v: number) => Number.isInteger(v) && v >= 0;
  for (let count = 1; count <= input.items.length; count++) {
    const row = input.combos.find((c) => c.count === count);
    if (!row) return { code: "missingCount", values: { count } };
    if (!isMoney(row.amount) || row.prices.some((p) => !isMoney(p.amount))) {
      return { code: "invalidAmount", values: { count } };
    }
    if (row.giftItemId != null && !input.giftableItemIds.has(row.giftItemId)) {
      return { code: "invalidGift", values: { count } };
    }
  }
  return null;
}

/**
 * 前端用（報名表、現場報名、後台預覽）：以公開 API 形狀的群組與項目算收費明細。
 * `amount` 為已依當下時段解析的單價；`extraItems` 補上不在群組裡的項目（舊制無群組活動）。
 */
export function priceGroupSelection<
  I extends { id: number; groupId?: number | null; amount: number; seatCount?: number | null },
>(
  groups: (ComboGroupInput & { items: I[] })[],
  selectedIds: number[],
  extraItems: I[] = []
): { lines: (PricedLine & { item: I })[]; appliedCombos: AppliedCombo[] } {
  const byId = new Map<number, I>();
  for (const item of extraItems) byId.set(item.id, item);
  for (const g of groups) for (const item of g.items) byId.set(item.id, { ...item, groupId: g.id });
  const priceable = new Map<number, PriceableItem>(
    Array.from(byId.values()).map((i) => [
      i.id,
      { id: i.id, groupId: i.groupId, unitPrice: i.amount, seatCount: i.seatCount },
    ])
  );
  const { lines, appliedCombos } = priceSelection(groups, priceable, selectedIds);
  return {
    lines: lines.map((l) => ({ ...l, item: byId.get(l.itemId)! })),
    appliedCombos,
  };
}
