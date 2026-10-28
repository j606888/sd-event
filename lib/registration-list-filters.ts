/**
 * Shared filter logic for registration list (used by event page and RegistrationsList).
 * Ensures counts and filtered list stay in sync when filters are lifted to parent.
 */

export type PaymentFilter = "all" | "pending" | "reported" | "confirmed" | "rejected" | "refunded";
/** "not_all"＝還有人沒入場（未入場 + 部分入場），門口快速篩選用 */
export type CheckInFilter = "all" | "none" | "partial" | "all_entered" | "not_all";
export type HiddenFilter = "all" | "hidden" | "non_hidden";
export type CouponFilter = "all" | "used" | "not_used";
/** 報名項目篩選："all" 或 purchaseItem id */
export type PurchaseItemFilter = "all" | number;

// 篩選選項只帶代碼與翻譯 key（events.registrations.filters.*），顯示文字由元件翻譯
export const PAYMENT_OPTIONS = [
  { value: "all", labelKey: "all" },
  { value: "confirmed", labelKey: "confirmed" },
  { value: "pending", labelKey: "pending" },
  { value: "reported", labelKey: "reported" },
  { value: "rejected", labelKey: "rejected" },
  { value: "refunded", labelKey: "refunded" },
] as const satisfies readonly { value: PaymentFilter; labelKey: string }[];

export const CHECK_IN_OPTIONS = [
  { value: "all", labelKey: "all" },
  { value: "none", labelKey: "none" },
  { value: "partial", labelKey: "partial" },
  { value: "all_entered", labelKey: "allEntered" },
] as const satisfies readonly { value: CheckInFilter; labelKey: string }[];

export const HIDDEN_OPTIONS = [
  { value: "non_hidden", labelKey: "nonHidden" },
  { value: "all", labelKey: "all" },
  { value: "hidden", labelKey: "hidden" },
] as const satisfies readonly { value: HiddenFilter; labelKey: string }[];

export const COUPON_OPTIONS = [
  { value: "all", labelKey: "all" },
  { value: "used", labelKey: "used" },
  { value: "not_used", labelKey: "notUsed" },
] as const satisfies readonly { value: CouponFilter; labelKey: string }[];

export function matchesPaymentFilter(
  status: "pending" | "reported" | "confirmed" | "rejected" | "refunded",
  filter: PaymentFilter
): boolean {
  if (filter === "all") return true;
  return status === filter;
}

export function matchesCheckInFilter(
  attendeeCount: number,
  checkedInCount: number,
  filter: CheckInFilter
): boolean {
  if (filter === "all") return true;
  const checked = checkedInCount ?? 0;
  if (filter === "none") return attendeeCount === 0 || checked === 0;
  if (filter === "all_entered") return attendeeCount > 0 && checked >= attendeeCount;
  if (filter === "partial") return attendeeCount > 0 && checked > 0 && checked < attendeeCount;
  if (filter === "not_all") return checked < attendeeCount;
  return true;
}

export function matchesHiddenFilter(hidden: boolean | undefined, filter: HiddenFilter): boolean {
  if (filter === "all") return true;
  if (filter === "hidden") return hidden === true;
  return hidden !== true; // non_hidden: show when not hidden
}

export type RegistrationForFilter = {
  id: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected" | "refunded";
  attendeeCount: number;
  checkedInCount?: number;
  hidden?: boolean;
};

export function filterRegistrations<T extends RegistrationForFilter>(
  registrations: T[],
  paymentFilter: PaymentFilter,
  checkInFilter: CheckInFilter,
  hiddenFilter: HiddenFilter
): T[] {
  return registrations.filter((reg) => {
    if (!matchesPaymentFilter(reg.paymentStatus, paymentFilter)) return false;
    if (!matchesCheckInFilter(reg.attendeeCount, reg.checkedInCount ?? 0, checkInFilter)) return false;
    if (!matchesHiddenFilter(reg.hidden, hiddenFilter)) return false;
    return true;
  });
}
