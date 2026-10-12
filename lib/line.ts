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

/** 驗證 LINE ID 或加好友連結；回傳錯誤訊息，合法回 null */
export function validateLineIdInput(value: string): string | null {
  const v = value.trim();
  if (!v) return "請輸入 LINE ID 或加好友連結";
  if (/^https?:\/\//i.test(v)) {
    try {
      const host = new URL(v).hostname;
      if (!/(^|\.)line\.me$|(^|\.)lin\.ee$/i.test(host)) {
        return "連結需為 LINE 的加好友連結（line.me 或 lin.ee）";
      }
    } catch {
      return "連結格式不正確";
    }
    return null;
  }
  if (/\s/.test(v)) return "LINE ID 不能包含空白";
  return null;
}
