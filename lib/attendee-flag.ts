/**
 * 參加者勾選項目（events.attendeeFlagLabel，如「參加伸展台比賽」）共用邏輯。
 *
 * 活動有設 label 時，報名表每位參加者多一個勾選框（存於 eventAttendees.flagged）。
 * 票券可設 minFlagged，要求選了此票的報名至少有幾位參加者勾選（如 1+1 套票其中一人須參賽）。
 *
 * 公開報名 route、現場報名 route、報名表單 hook、現場報名抽屜共用。
 * 純函式、不碰 DB，前後端都可以 import。
 */

export const MAX_MIN_FLAGGED = 10;

/** 正規化 label：空白視為未設定 */
export function normalizeFlagLabel(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  return trimmed ? trimmed : null;
}

/** 解析 API 傳入的 minFlagged：0..MAX_MIN_FLAGGED 的整數，否則 null（無效） */
export function parseMinFlagged(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= MAX_MIN_FLAGGED ? n : null;
}

/** 正規化 minFlagged：非正整數一律視為 0 */
export function minFlaggedOf(item: { minFlagged?: number | null }): number {
  const n = item.minFlagged;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : 0;
}

/** 所選票券中最嚴格的勾選人數要求；0 = 不要求 */
export function requiredFlaggedCount(items: { minFlagged?: number | null }[]): number {
  return items.reduce((max, item) => Math.max(max, minFlaggedOf(item)), 0);
}

export type FlaggedShortfall = { item: string; required: number; label: string };

/**
 * 找出第一張勾選人數不足的票券；null 表通過。介面用這個自己組（翻譯過的）訊息。
 * 活動未設 label 時不驗證（報名表也不會顯示勾選框）。
 */
export function findFlaggedShortfall(
  items: { name: string; minFlagged?: number | null }[],
  flaggedCount: number,
  label: string | null | undefined
): FlaggedShortfall | null {
  const flagLabel = normalizeFlagLabel(label);
  if (!flagLabel) return null;
  for (const item of items) {
    const required = minFlaggedOf(item);
    if (flaggedCount < required) return { item: item.name, required, label: flagLabel };
  }
  return null;
}
