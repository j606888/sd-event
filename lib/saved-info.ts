/** 常用資訊的種類（活動地點／主辦單位／銀行資訊／LINE 付款好友）；前後端共用 */
export type SavedInfoKind = "location" | "organizer" | "bankInfo" | "linePayee";

/** 正在使用某筆常用資訊的活動；列表 API 以 `usedBy` 回傳（JSON 化後日期是 ISO 字串） */
export type UsingEvent<D = Date> = {
  id: number;
  title: string;
  startAt: D;
  endAt: D;
  status: "draft" | "published";
};

/**
 * 付款資訊被「正在報名」的活動使用時不能刪：外鍵是 set null，刪了資料庫不會壞，
 * 但報名者的付款頁會突然沒有匯款帳號／LINE 好友可以付。
 */
export const PAYMENT_KINDS: readonly SavedInfoKind[] = ["bankInfo", "linePayee"];

/** 已發布且還沒結束 = 還在報名 */
export function isOnSale(
  event: { status: "draft" | "published"; endAt: Date | string },
  now = new Date()
): boolean {
  return event.status === "published" && new Date(event.endAt) > now;
}
