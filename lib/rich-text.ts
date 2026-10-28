import type { ReactNode } from "react";

/**
 * t.rich 傳給標籤的 chunks 是陣列（例如 [12]），直接放進元素會變成一個獨立的文字節點，
 * 頁面被 Google 翻譯後 React 更新不到畫面上的字，數字會停在翻譯當下。
 * 純文字的 chunks 接成單一字串，元素裡就只剩一個字串子節點，React 會整段替換。
 */
export function richText(chunks: ReactNode): ReactNode {
  if (
    Array.isArray(chunks) &&
    chunks.every((c) => typeof c === "string" || typeof c === "number")
  ) {
    return chunks.join("");
  }
  return chunks;
}
