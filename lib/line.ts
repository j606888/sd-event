/**
 * LINE 加好友連結工具。
 * 付款好友可存「LINE ID」或「加好友連結」，這裡統一轉成可點的網址。
 *
 * - 完整網址（https://line.me/ti/p/xxxx，從 LINE「QR 碼 → 複製連結」取得）→ 原樣使用
 * - 官方帳號 ID（@ 開頭，如 @abc123）→ https://line.me/R/ti/p/%40abc123
 * - 個人 ID（如 xiaoming）→ https://line.me/ti/p/~xiaoming
 */
export function lineAddFriendUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://line.me/R/ti/p/%40${encodeURIComponent(v.slice(1))}`;
  return `https://line.me/ti/p/~${encodeURIComponent(v)}`;
}

/** 存的是 LINE ID（可給參加者手動搜尋）而不是連結時回傳 ID，否則 null */
export function lineIdForDisplay(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v || /^https?:\/\//i.test(v)) return null;
  return v;
}

export type LineIdError = "empty" | "notLineHost" | "invalidUrl" | "hasWhitespace";

/** 驗證 LINE ID 或加好友連結；回傳錯誤代碼，合法回 null。介面依代碼翻譯 */
export function lineIdInputError(value: string): LineIdError | null {
  const v = value.trim();
  if (!v) return "empty";
  if (/^https?:\/\//i.test(v)) {
    try {
      const host = new URL(v).hostname;
      if (!/(^|\.)line\.me$|(^|\.)lin\.ee$/i.test(host)) return "notLineHost";
    } catch {
      return "invalidUrl";
    }
    return null;
  }
  if (/\s/.test(v)) return "hasWhitespace";
  return null;
}
