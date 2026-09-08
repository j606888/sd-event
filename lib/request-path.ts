import { headers } from "next/headers";

/**
 * Server component 拿不到目前的網址（Next 沒有這個 API），登入守衛卻要靠它才能
 * 組出 `?next=`。所以由 proxy.ts 把需要的資訊塞進 request header 轉交進來。
 */
export const PATHNAME_HEADER = "x-pathname";

/**
 * 「有 cookie 但已失效」的判斷同樣得由 proxy 轉交：proxy 會順手把死 cookie 清掉，
 * 之後 layout 自己讀 cookie 只會看到「什麼都沒有」，分不出是過期還是從沒登入。
 */
export const SESSION_EXPIRED_HEADER = "x-session-expired";

export type GuardContext = {
  /** 使用者原本想去的路徑，登入後導回這裡 */
  path: string | null;
  /** 是不是帶著失效的 session 進來的（用來決定要不要顯示「登入已過期」） */
  expired: boolean;
};

export async function getGuardContext(): Promise<GuardContext> {
  const h = await headers();
  return {
    path: h.get(PATHNAME_HEADER),
    expired: h.get(SESSION_EXPIRED_HEADER) === "1",
  };
}
