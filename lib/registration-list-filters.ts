/**
 * Shared filter logic for registration list (used by event page and RegistrationsList).
 * Ensures counts and filtered list stay in sync when filters are lifted to parent.
 */

export type PaymentFilter = "all" | "pending" | "reported" | "confirmed" | "rejected";
export type CheckInFilter = "all" | "none" | "partial" | "all_entered";
export type HiddenFilter = "all" | "hidden" | "non_hidden";

export const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "confirmed", label: "已完成付款" },
  { value: "pending", label: "待付款" },
  { value: "reported", label: "待確認" },
  { value: "rejected", label: "已退款" },
];

export const CHECK_IN_OPTIONS: { value: CheckInFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "none", label: "未入場" },
  { value: "partial", label: "部分入場" },
  { value: "all_entered", label: "已全部入場" },
];

export const HIDDEN_OPTIONS: { value: HiddenFilter; label: string }[] = [
  { value: "non_hidden", label: "未隱藏" },
  { value: "all", label: "全部" },
  { value: "hidden", label: "已隱藏" },
];

export function matchesPaymentFilter(
  status: "pending" | "reported" | "confirmed" | "rejected",
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
  return true;
}

export function matchesHiddenFilter(hidden: boolean | undefined, filter: HiddenFilter): boolean {
  if (filter === "all") return true;
  if (filter === "hidden") return hidden === true;
  return hidden !== true; // non_hidden: show when not hidden
}

export type RegistrationForFilter = {
  id: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
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
