/**
 * 票價時段（Price Tier）共用定價邏輯。
 *
 * 伺服器端共用（公開活動 route 顯示用、報名建立 route 收費快照用），
 * 一律以「伺服器時間」解析，避免 client 時鐘造成顯示價與收費價不一致。
 */
import { TAIPEI_OFFSET } from "./format-event-date";

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
  /** false = 此時段不販售；未帶視為 true */
  available?: boolean;
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
 *   - 該時段標為不販售（available = false）的列沒有價格意義，同樣退回 fallback；
 *     是否可購買請另用 `isItemSoldInTier` 判斷。
 */
export function getItemUnitPrice(
  itemAmount: number,
  itemPrices: ItemPrice[],
  tierId: number | null
): number {
  if (tierId == null) return itemAmount;
  const match = itemPrices.find((p) => p.tierId === tierId);
  return match && match.available !== false ? match.amount : itemAmount;
}

/**
 * 項目在指定時段是否販售。只有明確標為不販售（available = false）的列才算不賣；
 * 沒有列的時段沿用 fallback 價照常販售（舊資料、或之後才新增的時段）。
 */
export function isItemSoldInTier(itemPrices: ItemPrice[], tierId: number | null): boolean {
  if (tierId == null) return true;
  return itemPrices.find((p) => p.tierId === tierId)?.available !== false;
}

/**
 * 項目在目前時段的販售狀態（供報名頁顯示）：
 *   - "on_sale"：可購買
 *   - "upcoming"：之後的時段才開賣（`opensTierName` 為第一個開賣的時段）
 *   - "ended"：只在之前的時段販售，已截止（如早鳥限定票）
 */
export type ItemSaleStatus =
  | { status: "on_sale" }
  | { status: "upcoming"; opensTierName: string }
  | { status: "ended" };

/** 前端用：公開 API 的項目目前是否可購買（未帶 saleStatus 視為可購買） */
export function isItemOnSale(item: { saleStatus?: string | null }): boolean {
  return item.saleStatus == null || item.saleStatus === "on_sale";
}

/**
 * 前端用：不可購買項目的狀態；可購買回傳 null。
 * 只回傳代碼與時段名稱，狀態文字（已截止／某時段開賣／尚未開賣）由元件翻譯。
 */
export type UnavailableSaleStatus =
  | { status: "ended" }
  /** opensTierName 為 null 時沒有可顯示的開賣時段 */
  | { status: "upcoming"; opensTierName: string | null };

export function unavailableSaleStatus(item: {
  saleStatus?: string | null;
  opensTierName?: string | null;
}): UnavailableSaleStatus | null {
  if (item.saleStatus === "ended") return { status: "ended" };
  if (item.saleStatus === "upcoming") {
    return { status: "upcoming", opensTierName: item.opensTierName || null };
  }
  return null;
}

export function resolveItemSaleStatus<T extends PriceTier>(
  tiers: T[],
  itemPrices: ItemPrice[],
  activeTier: T | null
): ItemSaleStatus {
  if (activeTier == null || isItemSoldInTier(itemPrices, activeTier.id)) {
    return { status: "on_sale" };
  }
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeIndex = sorted.findIndex((t) => t.id === activeTier.id);
  const nextOpen = sorted
    .slice(activeIndex + 1)
    .find((t) => isItemSoldInTier(itemPrices, t.id));
  return nextOpen
    ? { status: "upcoming", opensTierName: nextOpen.name }
    : { status: "ended" };
}

/**
 * 把「只選日期」的截止輸入轉成該日台北時間 23:59:59.999 的 Date。
 * 接受 "YYYY-MM-DD"（date input）或完整 ISO 字串；空值回傳 null（fallback 段）。
 *
 * 一律錨定 Asia/Taipei：這個函式同時跑在 server（Vercel 為 UTC）與瀏覽器，
 * 若依賴執行環境時區，兩邊會算出相差 8 小時的截止點。
 */
export function endOfDayFromDateInput(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  // 純日期：以台北時間建構當日末
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const d = dateOnly
    ? new Date(`${trimmed}T23:59:59.999${TAIPEI_OFFSET}`)
    : new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}
