"use client";

import { useState } from "react";
import { Search, EyeOff, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  PAYMENT_OPTIONS,
  CHECK_IN_OPTIONS,
  HIDDEN_OPTIONS,
  COUPON_OPTIONS,
  type PaymentFilter,
  type CheckInFilter,
  type HiddenFilter,
  type CouponFilter,
} from "@/lib/registration-list-filters";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Registration } from "@/types/registration";

type RegistrationsListProps = {
  registrations: Registration[];
  onSelect: (registrationId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (v: PaymentFilter) => void;
  checkInFilter: CheckInFilter;
  onCheckInFilterChange: (v: CheckInFilter) => void;
  hiddenFilter: HiddenFilter;
  onHiddenFilterChange: (v: HiddenFilter) => void;
  couponFilter: CouponFilter;
  onCouponFilterChange: (v: CouponFilter) => void;
  /** Total count before filters (for empty state message) */
  totalUnfilteredCount?: number;
  isLoading?: boolean;
};

/** 篩選 pill 群：選中＝品牌色實心，未選＝灰底 */
function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            value === opt.value
              ? "bg-brand text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function getAttendanceTag(attendeeCount: number, checkedInCount: number) {
  const checked = checkedInCount ?? 0;
  if (attendeeCount === 0) return { label: "—", className: "bg-gray-100 text-gray-600" };
  if (checked === 0) return { label: "未入場", className: "bg-slate-100 text-slate-700" };
  if (checked >= attendeeCount) return { label: "已入場", className: "bg-sky-100 text-sky-700" };
  return {
    label: `${checked}/${attendeeCount} 已入場`,
    className: "bg-slate-100 text-slate-600",
  };
}

export function RegistrationsList({
  registrations,
  onSelect,
  searchQuery,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  checkInFilter,
  onCheckInFilterChange,
  hiddenFilter,
  onHiddenFilterChange,
  couponFilter,
  onCouponFilterChange,
  totalUnfilteredCount = 0,
  isLoading = false,
}: RegistrationsListProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    (paymentFilter !== "all" ? 1 : 0) +
    (checkInFilter !== "all" ? 1 : 0) +
    (hiddenFilter !== "non_hidden" ? 1 : 0) +
    (couponFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜尋名稱、電話、Email"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setFilterOpen(true)}
            aria-label="篩選條件"
          >
            <Filter className="w-4 h-4" />
          </Button>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="篩選條件">
        <div className="flex justify-end -mt-1 mb-2">
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">狀態</h3>
            <FilterPills
              options={PAYMENT_OPTIONS}
              value={paymentFilter}
              onChange={onPaymentFilterChange}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">入場狀態</h3>
            <FilterPills
              options={CHECK_IN_OPTIONS}
              value={checkInFilter}
              onChange={onCheckInFilterChange}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">折扣碼</h3>
            <FilterPills
              options={COUPON_OPTIONS}
              value={couponFilter}
              onChange={onCouponFilterChange}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">顯示</h3>
            <FilterPills
              options={HIDDEN_OPTIONS}
              value={hiddenFilter}
              onChange={onHiddenFilterChange}
            />
          </div>
        </div>
      </Drawer>

      {/* Registrations List */}
      {isLoading ? (
        <div className="divide-y divide-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
          {totalUnfilteredCount === 0 ? "尚無報名記錄" : "沒有符合條件的報名記錄"}
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {registrations.map((reg) => {
            const attendance = getAttendanceTag(reg.attendeeCount, reg.checkedInCount ?? 0);

            return (
              <button
                key={reg.id}
                onClick={() => onSelect(reg.id)}
                className="w-full text-left px-2 py-3.5 rounded-lg hover:bg-brand/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-2">
                      {reg.contactName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {reg.attendeeCount}人
                      </span>
                      {reg.source === "walk_in" && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          現場
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        NT ${reg.totalAmount.toLocaleString()}
                      </span>
                      {reg.couponCode && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium font-mono bg-brand/10 text-brand">
                          {reg.couponCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 shrink-0 flex-wrap">
                    {reg.hidden && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <EyeOff className="w-3 h-3 shrink-0" />
                        已隱藏
                      </span>
                    )}
                    <PaymentStatusBadge status={reg.paymentStatus} />
                    <div
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${attendance.className}`}
                    >
                      {attendance.label}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
