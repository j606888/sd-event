"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, QrCode, Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { UndoToast } from "@/components/ui/undo-toast";
import {
  PAYMENT_OPTIONS,
  CHECK_IN_OPTIONS,
  HIDDEN_OPTIONS,
  COUPON_OPTIONS,
  type PaymentFilter,
  type CheckInFilter,
  type HiddenFilter,
  type CouponFilter,
  type PurchaseItemFilter,
} from "@/lib/registration-list-filters";
import { useReadOnly } from "@/hooks/use-session";
import {
  useCheckIn,
  useUndoCheckIn,
  useUpdateRegistration,
  type PurchaseItemOption,
} from "@/hooks/use-registrations";
import { cn } from "@/lib/utils";
import { ConfirmActionDrawer } from "./ConfirmActionDrawer";
import { RegistrationRow, type RowAction } from "./RegistrationRow";
import type { Registration } from "@/types/registration";

type RegistrationsListProps = {
  eventId: string;
  registrations: Registration[];
  /** 管理員為 true；驗票人員為 false：不顯示金額與折扣碼，也不能確認收款 */
  canManage?: boolean;
  selectedId: number | null;
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
  purchaseItemFilter: PurchaseItemFilter;
  onPurchaseItemFilterChange: (v: PurchaseItemFilter) => void;
  /** 「報名項目」篩選的選項（活動的所有票種，含已隱藏的） */
  purchaseItemOptions: PurchaseItemOption[];
  /** 符合目前搜尋與篩選的總筆數（跨頁） */
  matchedTotal: number;
  isLoading?: boolean;
  onWalkIn: () => void;
  /** 管理員才有；不給就不顯示匯出 */
  onExportCsv?: () => void;
};

/** 篩選 pill 群：選中＝品牌色實心，未選＝灰底 */
function FilterPills<T extends string | number>({
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
              ? "bg-brand text-ink"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 搜尋框下方的快速篩選：門口與對帳最常切的幾種，一點就到。
 * 每個都是「付款 + 入場」兩個篩選的固定組合；其餘條件留在篩選抽屜。
 */
const QUICK_FILTERS: { label: string; payment: PaymentFilter; checkIn: CheckInFilter }[] = [
  { label: "全部", payment: "all", checkIn: "all" },
  { label: "待確認收款", payment: "reported", checkIn: "all" },
  { label: "未付款", payment: "pending", checkIn: "all" },
  { label: "未入場", payment: "all", checkIn: "not_all" },
  { label: "已入場", payment: "all", checkIn: "all_entered" },
];

type UndoState = { key: number; name: string; attendeeIds: number[] };

export function RegistrationsList({
  eventId,
  registrations,
  canManage = true,
  selectedId,
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
  purchaseItemFilter,
  onPurchaseItemFilterChange,
  purchaseItemOptions,
  matchedTotal,
  isLoading = false,
  onWalkIn,
  onExportCsv,
}: RegistrationsListProps) {
  const readOnly = useReadOnly();
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const updateRegistration = useUpdateRegistration(eventId);
  const checkIn = useCheckIn(eventId);
  const undoCheckIn = useUndoCheckIn(eventId);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** 款項未確認就要入場的那一筆，等使用者在警告裡確認 */
  const [unpaidCheckIn, setUnpaidCheckIn] = useState<Registration | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const dismissUndo = useCallback(() => setUndo(null), []);

  // 桌機一進來就能直接打字找人；手機不自動聚焦，免得鍵盤彈出來蓋住名單
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      searchRef.current?.focus();
    }
  }, []);

  const runCheckIn = async (reg: Registration) => {
    const targets = reg.attendees.filter((a) => !a.checkedIn).map((a) => a.id);
    setActionError(null);
    setBusyId(reg.id);
    const done: number[] = [];
    try {
      // 一筆報名通常 1–4 人，依序送即可（與明細頁相同作法）
      for (const id of targets) {
        await checkIn.mutateAsync(id);
        done.push(id);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "入場失敗，請重試");
    } finally {
      setBusyId(null);
      if (done.length > 0) {
        setUndo({ key: Date.now(), name: reg.contactName, attendeeIds: done });
      }
    }
  };

  const handleAction = async (reg: Registration, action: RowAction) => {
    if (action.kind === "check_in") {
      await runCheckIn(reg);
    } else if (action.kind === "check_in_unpaid") {
      setUnpaidCheckIn(reg);
    } else if (action.kind === "confirm_payment") {
      setActionError(null);
      setBusyId(reg.id);
      try {
        await updateRegistration.mutateAsync({
          registrationId: reg.id,
          patch: { paymentStatus: "confirmed" },
        });
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "確認收款失敗，請重試");
      } finally {
        setBusyId(null);
      }
    }
  };

  const handleUndo = async () => {
    if (!undo) return;
    const { attendeeIds } = undo;
    setUndo(null);
    setActionError(null);
    try {
      for (const id of attendeeIds) {
        await undoCheckIn.mutateAsync(id);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "取消入場失敗，請重試");
    }
  };

  // 快速篩選已經涵蓋付款與入場，徽章只數抽屜裡才看得到的條件
  const quickFilterActive = QUICK_FILTERS.some(
    (q) => q.payment === paymentFilter && q.checkIn === checkInFilter
  );
  const drawerFilterCount =
    (quickFilterActive ? 0 : 1) +
    (hiddenFilter !== "non_hidden" ? 1 : 0) +
    (couponFilter !== "all" ? 1 : 0) +
    (purchaseItemFilter !== "all" ? 1 : 0);

  const itemFilterOptions: { value: PurchaseItemFilter; label: string }[] = [
    { value: "all", label: "全部" },
    ...purchaseItemOptions.map((item) => ({ value: item.id, label: item.name })),
  ];
  const activeItemName =
    purchaseItemFilter === "all"
      ? null
      : purchaseItemOptions.find((item) => item.id === purchaseItemFilter)?.name ?? null;

  const hasQuery =
    searchQuery.trim().length > 0 ||
    paymentFilter !== "all" ||
    checkInFilter !== "all" ||
    hiddenFilter !== "non_hidden" ||
    couponFilter !== "all" ||
    purchaseItemFilter !== "all";

  return (
    <div className="space-y-3">
      {/* 搜尋：這一頁最重要的東西，所以最大 */}
      <div className="flex gap-2">
        <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-brand bg-white px-4 focus-within:ring-4 focus-within:ring-brand/25">
          <Search className="size-5 shrink-0 text-ink" strokeWidth={2.2} />
          <input
            ref={searchRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            aria-label="搜尋報名者"
            placeholder="輸入姓名、電話或 Email 找人"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                searchRef.current?.focus();
              }}
              aria-label="清除搜尋"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-ink hover:bg-field hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : (
            !isLoading && (
              <span className="hidden shrink-0 text-xs text-muted-ink tabular-nums sm:inline">
                {`共 ${matchedTotal} 筆`}
              </span>
            )
          )}
        </label>
        <Link
          href={`/events/${eventId}/scan`}
          aria-label="掃描 QR Code"
          className="flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          <QrCode className="size-5" />
          <span className="hidden sm:inline">掃 QR</span>
        </Link>
      </div>

      {/* 快速篩選 + 次要工具 */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap">
          {QUICK_FILTERS.map((q) => {
            const active = q.payment === paymentFilter && q.checkIn === checkInFilter;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  onPaymentFilterChange(q.payment);
                  onCheckInFilterChange(q.checkIn);
                }}
                className={cn(
                  "h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-brand bg-brand font-bold text-ink"
                    : "border-gray-300 bg-white text-muted-ink hover:border-ink hover:text-ink"
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>
        {onExportCsv && (
          <Button
            type="button"
            variant="outline"
            onClick={onExportCsv}
            disabled={registrations.length === 0}
            aria-label="匯出 CSV"
            className="hidden h-10 shrink-0 gap-1.5 rounded-full px-3.5 sm:inline-flex"
          >
            <Download className="size-4" />
            匯出
          </Button>
        )}
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterOpen(true)}
            aria-label="更多篩選條件"
            className="size-10 rounded-full p-0"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
          {drawerFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
              {drawerFilterCount}
            </span>
          )}
        </div>
      </div>

      {/* 項目篩選生效時明確標示，從統計頁跳過來才看得出目前在看哪個項目 */}
      {activeItemName && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          報名項目
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pr-1.5 pl-3 text-xs font-medium text-brand-strong">
            {activeItemName}
            <button
              type="button"
              onClick={() => onPurchaseItemFilterChange("all")}
              className="rounded-full p-0.5 hover:bg-brand/30 cursor-pointer"
              aria-label="清除報名項目篩選"
            >
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      )}

      {actionError && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
          <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
          {actionError}
        </p>
      )}

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
          {purchaseItemOptions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">報名項目</h3>
              <FilterPills
                options={itemFilterOptions}
                value={purchaseItemFilter}
                onChange={onPurchaseItemFilterChange}
              />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">入場狀態</h3>
            <FilterPills
              options={CHECK_IN_OPTIONS}
              value={checkInFilter}
              onChange={onCheckInFilterChange}
            />
          </div>
          {canManage && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">折扣碼</h3>
              <FilterPills
                options={COUPON_OPTIONS}
                value={couponFilter}
                onChange={onCouponFilterChange}
              />
            </div>
          )}
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
        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center">
          <p className="text-base font-bold text-ink">
            {hasQuery ? "名單裡找不到這個人" : "還沒有人報名"}
          </p>
          <p className="text-sm text-muted-ink">
            {hasQuery
              ? "換電話末三碼或其他篩選試試，或直接幫他現場報名。"
              : "把報名表單分享出去，或先幫到場的人現場報名。"}
          </p>
          <Button
            type="button"
            onClick={onWalkIn}
            disabled={readOnly}
            title={readOnly ? "模擬檢視為唯讀模式" : undefined}
            className="h-11 gap-1.5 rounded-xl px-5 font-bold"
          >
            <UserPlus className="size-4" />
            現場報名
          </Button>
        </div>
      ) : (
        // @container：桌機開著右側明細時名單會變窄，列的排版要跟著名單寬度而不是視窗寬度
        <div className="@container space-y-1.5">
          {registrations.map((reg) => (
            <RegistrationRow
              key={reg.id}
              registration={reg}
              canManage={canManage}
              selected={reg.id === selectedId}
              busy={busyId === reg.id}
              disabled={readOnly}
              onSelect={() => onSelect(reg.id)}
              onAction={(action) => void handleAction(reg, action)}
            />
          ))}
        </div>
      )}

      {/* 款項未確認就要放人進場：沿用明細頁的確認，不動付款狀態 */}
      <ConfirmActionDrawer
        open={unpaidCheckIn !== null}
        onClose={() => setUnpaidCheckIn(null)}
        title="尚未確認收款"
        description="這筆報名的款項還沒確認。仍要讓參與者入場嗎？"
        summary={
          unpaidCheckIn && (
            <span className="text-gray-600">
              {unpaidCheckIn.contactName} ·{" "}
              {unpaidCheckIn.attendees.filter((a) => !a.checkedIn).length} 人
            </span>
          )
        }
        confirmLabel="仍要入場"
        pendingLabel="處理中…"
        onConfirm={async () => {
          if (unpaidCheckIn) await runCheckIn(unpaidCheckIn);
        }}
      />

      {undo && (
        <UndoToast
          key={undo.key}
          message={`${undo.name} 已入場`}
          onUndo={() => void handleUndo()}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
}
