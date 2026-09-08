/**
 * 滑動續期的判斷：剩餘壽命不到一半就換發新 token。
 *
 * 用「過半」而不是「快過期才換」的理由是兩邊都不想要 —— 每個 request 都重發
 * token 太浪費，拖到剩幾分鐘才救則遇到久沒開的分頁就來不及。過半換發代表
 * 只要在一個 TTL 週期內回來用過一次，session 就會一直活著。
 */
export function shouldRefreshSession(
  expSeconds: number,
  nowSeconds: number,
  maxAgeSeconds: number
): boolean {
  const remaining = expSeconds - nowSeconds;
  // 已經過期的不在這裡處理（proxy 會把 cookie 清掉）
  if (remaining <= 0) return false;
  return remaining < maxAgeSeconds / 2;
}
