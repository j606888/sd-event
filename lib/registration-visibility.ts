/**
 * 驗票人員（staff）看得到報名者與報到狀態，但看不到任何金額。
 *
 * `paymentStatus` 刻意保留 —— 門口必須知道這筆有沒有付款，
 * ScannedRegistrationDetail 也靠它決定未付款時要不要跳確認。
 */

/** 報名記錄上與金額有關、驗票人員不該看到的欄位 */
const MONEY_FIELDS = [
  "totalAmount",
  "discountAmount",
  "couponCode",
  "paymentScreenshotUrl",
] as const;

type WithPurchaseItems = {
  purchaseItem?: unknown;
  purchaseItems?: unknown;
};

const ITEM_MONEY_FIELDS = ["amount", "unitAmount"] as const;

function stripItemAmount(item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const rest: Record<string, unknown> = { ...(item as Record<string, unknown>) };
  for (const field of ITEM_MONEY_FIELDS) delete rest[field];
  return rest;
}

/** 移除報名記錄上的所有金額欄位（含購買項目的單價） */
export function stripRegistrationMoney<T extends Record<string, unknown>>(
  registration: T
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...registration };
  for (const field of MONEY_FIELDS) delete out[field];

  const withItems = registration as WithPurchaseItems;
  if ("purchaseItem" in registration) {
    out.purchaseItem = stripItemAmount(withItems.purchaseItem);
  }
  if (Array.isArray(withItems.purchaseItems)) {
    out.purchaseItems = withItems.purchaseItems.map(stripItemAmount);
  }
  return out;
}

/** 依角色決定要不要剝除金額 */
export function applyRegistrationVisibility<T extends Record<string, unknown>>(
  registration: T,
  canSeeMoney: boolean
): Record<string, unknown> {
  return canSeeMoney ? registration : stripRegistrationMoney(registration);
}
