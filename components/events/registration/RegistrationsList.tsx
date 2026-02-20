"use client";

import { useState, useMemo } from "react";
import { Search, Cloud, CheckCircle2, Clock, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

type Registration = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  totalAmount: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
  attendeeCount: number;
  checkedInCount?: number;
  createdAt: string;
};

type PaymentFilter = "all" | "pending" | "reported" | "confirmed" | "rejected";
type CheckInFilter = "all" | "none" | "partial" | "all_entered";

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "confirmed", label: "已完成付款" },
  { value: "pending", label: "待付款" },
  { value: "reported", label: "待確認" },
  { value: "rejected", label: "已退款" },
];

const CHECK_IN_OPTIONS: { value: CheckInFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "none", label: "未入場" },
  { value: "partial", label: "部分入場" },
  { value: "all_entered", label: "已全部入場" },
];

type RegistrationsListProps = {
  registrations: Registration[];
  onSelect: (registrationId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

function getStatusBadge(status: Registration["paymentStatus"]) {
  switch (status) {
    case "pending":
      return {
        icon: Cloud,
        label: "尚未付款",
        className: "bg-gray-100 text-gray-700",
      };
    case "reported":
      return {
        icon: Clock,
        label: "待確認",
        className: "bg-yellow-100 text-yellow-800",
      };
    case "confirmed":
      return {
        icon: CheckCircle2,
        label: "已完成付款",
        className: "bg-green-100 text-green-700",
      };
    case "rejected":
      return {
        icon: Clock,
        label: "已拒絕",
        className: "bg-red-100 text-red-700",
      };
    default:
      return {
        icon: Cloud,
        label: "未知",
        className: "bg-gray-100 text-gray-700",
      };
  }
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

function matchesPaymentFilter(status: Registration["paymentStatus"], filter: PaymentFilter): boolean {
  if (filter === "all") return true;
  return status === filter;
}

function matchesCheckInFilter(
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

export function RegistrationsList({
  registrations,
  onSelect,
  searchQuery,
  onSearchChange,
}: RegistrationsListProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("all");

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (!matchesPaymentFilter(reg.paymentStatus, paymentFilter)) return false;
      if (!matchesCheckInFilter(reg.attendeeCount, reg.checkedInCount ?? 0, checkInFilter)) return false;
      return true;
    });
  }, [registrations, paymentFilter, checkInFilter]);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜尋名稱、銀行末五碼、Line ID"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setFilterOpen(true)}
          className="shrink-0"
          aria-label="篩選條件"
        >
          <Filter className="w-4 h-4" />
        </Button>
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
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentFilter(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    paymentFilter === opt.value
                      ? opt.value === "all"
                        ? "bg-[#5295BC] text-white"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">入場狀態</h3>
            <div className="flex flex-wrap gap-2">
              {CHECK_IN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCheckInFilter(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    checkInFilter === opt.value
                      ? opt.value === "all"
                        ? "bg-[#5295BC] text-white"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
          {registrations.length === 0 ? "尚無報名記錄" : "沒有符合條件的報名記錄"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRegistrations.map((reg) => {
            const statusBadge = getStatusBadge(reg.paymentStatus);
            const StatusIcon = statusBadge.icon;
            const attendance = getAttendanceTag(reg.attendeeCount, reg.checkedInCount ?? 0);

            return (
              <button
                key={reg.id}
                onClick={() => onSelect(reg.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
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
                      <span className="text-sm text-gray-600">
                        NT ${reg.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
                    >
                      <StatusIcon className="w-3 h-3 shrink-0" />
                      <span>{statusBadge.label}</span>
                    </div>
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
