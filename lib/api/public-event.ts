import type { PublicEventData } from "@/types/event";

/**
 * 依公開金鑰取得活動（不需登入）
 * @returns 活動資料，404 時回傳 null，其他錯誤 throw（message 為空，由介面顯示翻譯過的「無法載入活動」）
 */
export async function getPublicEvent(
  publicKey: string
): Promise<PublicEventData | null> {
  const res = await fetch(
    `/api/events/public/${encodeURIComponent(publicKey)}`
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("");
  }

  const data = await res.json();
  return data?.event ?? null;
}
