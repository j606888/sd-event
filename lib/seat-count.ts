/**
 * 套票（seatCount > 1，如雙人票）共用邏輯。
 *
 * 一般票：價格 × 參加者人數。
 * 套票：價格為整組價、不乘人數，且選了套票的報名參加者人數必須剛好等於 seatCount。
 *
 * 公開報名 route、現場報名 route、報名表單 hook、統計 route 共用，確保收費、驗證與顯示一致。
 * 純函式、不碰 DB，前後端都可以 import。
 */

export type SeatItem = {
  name: string;
  /** 舊資料 / 未帶此欄位視為 1 */
  seatCount?: number | null;
};

/** 正規化 seatCount：非正整數一律視為 1 */
export function seatCountOf(item: { seatCount?: number | null }): number {
  const n = item.seatCount;
  return typeof n === "number" && Number.isInteger(n) && n > 1 ? n : 1;
}

export function isBundleItem(item: { seatCount?: number | null }): boolean {
  return seatCountOf(item) > 1;
}

/** 單一項目在這筆報名裡要收幾份價：套票 1 份，一般票每位參加者 1 份 */
export function priceUnitsFor(
  item: { seatCount?: number | null },
  attendeeCount: number
): number {
  return isBundleItem(item) ? 1 : attendeeCount;
}

/** Σ 各項目單價 × 收費份數 */
export function computeItemsTotal(
  items: { unitPrice: number; seatCount?: number | null }[],
  attendeeCount: number
): number {
  return items.reduce(
    (sum, item) => sum + item.unitPrice * priceUnitsFor(item, attendeeCount),
    0
  );
}

/**
 * 選取的套票所要求的參加者人數；沒有選套票回傳 null。
 * 多張套票人數不一致時回傳第一張的人數（驗證會另外擋下）。
 */
export function requiredAttendeeCount(items: SeatItem[]): number | null {
  const bundle = items.find(isBundleItem);
  return bundle ? seatCountOf(bundle) : null;
}

export type SeatCountMismatch = { item: string; required: number; actual: number };

/** 找出第一張人數不符的套票；null 表通過。介面用這個自己組（翻譯過的）訊息 */
export function findSeatCountMismatch(
  items: SeatItem[],
  attendeeCount: number
): SeatCountMismatch | null {
  for (const item of items) {
    if (!isBundleItem(item)) continue;
    const required = seatCountOf(item);
    if (attendeeCount !== required) {
      return { item: item.name, required, actual: attendeeCount };
    }
  }
  return null;
}

/** 驗證參加者人數符合所選套票。回傳中文錯誤訊息，或 null 表通過。 */
export function validateSeatCount(
  items: SeatItem[],
  attendeeCount: number
): string | null {
  const m = findSeatCountMismatch(items, attendeeCount);
  return m ? `「${m.item}」需填寫剛好 ${m.required} 位參加者（目前 ${m.actual} 位）` : null;
}
