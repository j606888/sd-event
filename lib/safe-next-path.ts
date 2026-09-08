/**
 * 登入頁的 `?next=` 目的地處理。
 *
 * 這個值來自網址列，等於是使用者（或任何寄連結給他的人）可以控制的輸入，
 * 登入後又會直接拿去導向 —— 沒擋好就是一個 open redirect：
 * `/login?next=https://evil.example` 會讓釣魚站看起來像是從本站登入後跳過去的。
 * 所以只接受「站內的絕對路徑」，其餘一律回 null 退回預設頁。
 */

/** 導回這些路徑沒有意義（登入頁自己、或不是給瀏覽器看的端點） */
function isUselessTarget(path: string): boolean {
  return (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/register" ||
    path.startsWith("/register/") ||
    path === "/api" ||
    path.startsWith("/api/")
  );
}

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // 換行等控制字元可能被用來注入 header
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;

  // 必須是站內絕對路徑：擋掉 https://evil.example 與 evil.example 這種相對寫法
  if (!raw.startsWith("/")) return null;
  // //evil.example 會被瀏覽器當成 protocol-relative URL，等於跳出站外
  if (raw.startsWith("//")) return null;
  // 部分瀏覽器把反斜線當斜線處理，/\evil.example 同樣會跳出站外
  if (raw.includes("\\")) return null;

  const path = raw.split("?")[0].split("#")[0];
  if (isUselessTarget(path)) return null;

  return raw;
}

/** 組出登入頁網址，帶上「從哪裡來」與「是不是被過期踢出來的」 */
export function loginPath(
  next?: string | null,
  options?: { expired?: boolean }
): string {
  const params = new URLSearchParams();
  if (options?.expired) params.set("expired", "1");
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}
