import type { AppliedCoupon } from "@/types/event";

export type ValidateCouponResult =
  | { valid: true; coupon: AppliedCoupon }
  | {
      valid: false;
      reason: "not_found" | "exhausted" | "not_supported";
      error: string;
    };

/** 公開驗證折扣碼（報名表單預覽用）；實際折扣由報名 POST 權威重算 */
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
    throw new Error(data.error || "驗證折扣碼失敗，請稍後再試");
  }

  return data as ValidateCouponResult;
}
