import type { AppliedCoupon } from "@/types/event";

export type ValidateCouponResult =
  | { valid: true; coupon: AppliedCoupon }
  | {
      valid: false;
      reason: "not_found" | "exhausted" | "not_supported";
      error: string;
    };

/**
 * 公開驗證折扣碼（報名表單預覽用）；實際折扣由報名 POST 權威重算。
 * 失敗時 throw：有伺服器訊息（已依使用者語言翻譯）就用它，否則 message 為空，由介面顯示預設文案。
 */
export async function validateCoupon(
  eventId: number,
  code: string
): Promise<ValidateCouponResult> {
  const res = await fetch(`/api/events/${eventId}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "");
  }

  return data as ValidateCouponResult;
}
