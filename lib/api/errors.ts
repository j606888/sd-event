/**
 * API 回 401 時丟這個，讓呼叫端能把「登入已過期」跟一般的網路／伺服器錯誤分開。
 *
 * 判斷一律用 `isUnauthorizedError()` 而不是 `instanceof` —— client bundle 拆分後
 * `instanceof` 不見得可靠，比對 `name` 才穩。
 */
export class UnauthorizedError extends Error {
  constructor(message = "未登入或登入已過期") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.name === "UnauthorizedError";
}
