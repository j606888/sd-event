/**
 * 組合價的 DB 讀取（伺服器端）。計算邏輯在 lib/combo-pricing.ts。
 */
import { db } from "@/db";
import { eventGroupCombos, eventGroupComboPrices, eventPurchaseItems } from "@/db/schema";
import { asc, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getItemUnitPrice } from "./pricing";
import {
  mergeComboItems,
  priceSelection,
  type ComboRow,
  type PriceableItem,
  type PricedLine,
} from "./combo-pricing";

export type StoredCombo = {
  id: number;
  groupId: number;
  count: number;
  title: string | null;
  /** fallback 價（無時段 / 最後一段） */
  amount: number;
  giftItemId: number | null;
  prices: { tierId: number; amount: number }[];
};

/** 讀取多個群組的組合價（含各時段價），依 groupId 分組、count 升冪 */
export async function loadGroupCombos(groupIds: number[]): Promise<Map<number, StoredCombo[]>> {
  const result = new Map<number, StoredCombo[]>();
  if (groupIds.length === 0) return result;

  const combos = await db
    .select()
    .from(eventGroupCombos)
    .where(inArray(eventGroupCombos.groupId, groupIds))
    .orderBy(asc(eventGroupCombos.count));
  const comboIds = combos.map((c) => c.id);
  const priceRows =
    comboIds.length > 0
      ? await db
          .select()
          .from(eventGroupComboPrices)
          .where(inArray(eventGroupComboPrices.comboId, comboIds))
      : [];

  const pricesByCombo = new Map<number, { tierId: number; amount: number }[]>();
  for (const row of priceRows) {
    const arr = pricesByCombo.get(row.comboId) ?? [];
    arr.push({ tierId: row.tierId, amount: row.amount });
    pricesByCombo.set(row.comboId, arr);
  }
  for (const c of combos) {
    const arr = result.get(c.groupId) ?? [];
    arr.push({
      id: c.id,
      groupId: c.groupId,
      count: c.count,
      title: c.title,
      amount: c.amount,
      giftItemId: c.giftItemId,
      prices: pricesByCombo.get(c.id) ?? [],
    });
    result.set(c.groupId, arr);
  }
  return result;
}

/** 把儲存的組合價解析成某時段的價目表（沒有該時段列價時用 fallback amount） */
export function resolveCombosForTier(combos: StoredCombo[], tierId: number | null): ComboRow[] {
  return combos.map((c) => ({
    count: c.count,
    title: c.title,
    amount: getItemUnitPrice(c.amount, c.prices, tierId),
    giftItemId: c.giftItemId,
  }));
}

/**
 * 報名建立（公開報名、現場報名）共用：依當下時段把選取項目算成收費明細，
 * 套用組合價並帶入附贈票。沒有組合價區塊時等同「每項沿用單價」。
 */
export async function priceRegistrationLines(
  groups: { id: number; comboPricing: boolean; selectionMode: string }[],
  selectedItems: { id: number; groupId: number | null; seatCount: number }[],
  unitPriceById: Map<number, number>,
  tierId: number | null
): Promise<PricedLine[]> {
  const comboGroups = groups.filter((g) => g.comboPricing && g.selectionMode === "multiple");
  const itemsById = new Map<number, PriceableItem>(
    selectedItems.map((item) => [
      item.id,
      {
        id: item.id,
        groupId: item.groupId,
        unitPrice: unitPriceById.get(item.id) ?? 0,
        seatCount: item.seatCount,
      },
    ])
  );
  const selectedIds = selectedItems.map((i) => i.id);
  if (comboGroups.length === 0) {
    return priceSelection([], itemsById, selectedIds).lines;
  }

  const stored = await loadGroupCombos(comboGroups.map((g) => g.id));
  const resolved = comboGroups.map((g) => ({
    id: g.id,
    comboPricing: true,
    combos: resolveCombosForTier(stored.get(g.id) ?? [], tierId),
  }));

  // 附贈票不一定在選取中：先載入，priceSelection 只在達到該數量時才加入
  const giftIds = Array.from(
    new Set(
      resolved
        .flatMap((g) => g.combos.map((c) => c.giftItemId))
        .filter((id): id is number => id != null && !itemsById.has(id))
    )
  );
  if (giftIds.length > 0) {
    const gifts = await db
      .select({
        id: eventPurchaseItems.id,
        groupId: eventPurchaseItems.groupId,
        seatCount: eventPurchaseItems.seatCount,
      })
      .from(eventPurchaseItems)
      .where(inArray(eventPurchaseItems.id, giftIds));
    for (const g of gifts) {
      itemsById.set(g.id, { id: g.id, groupId: g.groupId, unitPrice: 0, seatCount: g.seatCount });
    }
  }

  return priceSelection(resolved, itemsById, selectedIds).lines;
}

/**
 * 依請求者語系組「Full Pass（A、B、C）」的格式器，給報名明細／列表／匯出／通知信合併組合價項目用。
 */
export async function comboLabelFormatter(): Promise<(title: string, names: string[]) => string> {
  const t = await getTranslations("eventApiErrors.registrationList");
  const separator = t("itemSeparator");
  return (title, names) => t("comboLabel", { title, items: names.join(separator) });
}

/** mergeComboItems + 依語系格式化 */
export async function mergeComboItemsLocalized<
  T extends { name: string; amount?: number | null; comboTitle?: string | null },
>(items: T[]): Promise<T[]> {
  if (!items.some((i) => i.comboTitle)) return items;
  return mergeComboItems(items, await comboLabelFormatter());
}

/** 收費明細各項目的名稱（含附贈票），給通知信用 */
export async function lineItemNames(
  lines: PricedLine[],
  knownNames: Map<number, string>
): Promise<{ name: string; comboTitle: string | null }[]> {
  const missing = lines.map((l) => l.itemId).filter((id) => !knownNames.has(id));
  const names = new Map(knownNames);
  if (missing.length > 0) {
    const rows = await db
      .select({ id: eventPurchaseItems.id, name: eventPurchaseItems.name })
      .from(eventPurchaseItems)
      .where(inArray(eventPurchaseItems.id, missing));
    for (const r of rows) names.set(r.id, r.name);
  }
  return lines.map((l) => ({ name: names.get(l.itemId) ?? "", comboTitle: l.comboTitle }));
}
