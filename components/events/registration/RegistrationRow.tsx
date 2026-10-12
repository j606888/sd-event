"use client";

import { Check, EyeOff } from "lucide-react";
import { formatClockTime } from "@/lib/format-event-date";
import { cn } from "@/lib/utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RoleBadge } from "./RoleBadge";
import type { Registration } from "@/types/registration";

/** 名單列上唯一的「下一步」。一列只給一個，門口才不用想要按哪顆。 */
export type RowAction =
  | { kind: "confirm_payment" }
  /** 已確認收款，直接入場 */
  | { kind: "check_in"; count: number }
  /** 款項還沒確認，入場前要先跳警告 */
  | { kind: "check_in_unpaid"; count: number }
  | { kind: "entered"; at: string | null }
  | { kind: "none" };

export function getRowAction(reg: Registration, canManage: boolean): RowAction {
  const remaining = reg.attendees.filter((a) => !a.checkedIn).length;
  if (reg.attendees.length === 0) return { kind: "none" };
  if (remaining === 0) {
    const times = reg.attendees
      .map((a) => a.checkedInAt)
      .filter((t): t is string => !!t)
      .sort();
    return { kind: "entered", at: times[times.length - 1] ?? null };
  }
  // 驗票人員不能改付款狀態，待確認的單在他們眼中就是「還沒確認」
  if (canManage && reg.paymentStatus === "reported") return { kind: "confirm_payment" };
  if (reg.paymentStatus === "confirmed") return { kind: "check_in", count: remaining };
  return { kind: "check_in_unpaid", count: remaining };
}

type RegistrationRowProps = {
  registration: Registration;
  /** 管理員為 true；驗票人員為 false：不顯示金額、折扣碼，也沒有確認收款 */
  canManage: boolean;
  selected: boolean;
  /** 這一列的動作正在送出 */
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
  onAction: (action: RowAction) => void;
};

const ACTION_BASE =
  "flex h-12 w-[104px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 @2xl:h-11 @2xl:w-[112px]";

export function RegistrationRow({
  registration: reg,
  canManage,
  selected,
  busy,
  disabled,
  onSelect,
  onAction,
}: RegistrationRowProps) {
  const action = getRowAction(reg, canManage);
  const partiallyEntered =
    action.kind !== "entered" && (reg.checkedInCount ?? 0) > 0
      ? `${reg.checkedInCount}/${reg.attendeeCount} 已入場`
      : null;
  // 單人報名且參加者就是聯絡人時，名字不用再寫一次，只留角色
  const sameAsContact =
    reg.attendees.length === 1 && reg.attendees[0].name.trim() === reg.contactName.trim();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-white py-2 pl-4 pr-2 transition-colors",
        selected ? "border-brand bg-brand-soft/50 ring-1 ring-brand" : "border-card-border hover:border-brand"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`查看 ${reg.contactName} 的報名明細`}
        className="flex min-h-[52px] min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-1 py-1 text-left @2xl:flex-row @2xl:items-center @2xl:gap-4"
      >
        <span className="flex min-w-0 flex-col gap-1 @2xl:flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-base font-bold text-ink">{reg.contactName}</span>
            {sameAsContact && <RoleBadge role={reg.attendees[0].role} compact />}
            {reg.source === "walk_in" && (
              <span className="rounded-md bg-brand-soft px-1.5 py-px text-[11px] font-bold text-brand-strong">
                現場
              </span>
            )}
            {reg.hidden && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-px text-[11px] font-bold text-amber-800">
                <EyeOff className="size-3" />
                已隱藏
              </span>
            )}
          </span>
          {!sameAsContact && reg.attendees.length > 0 && (
            <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] text-muted-ink">
              {reg.attendees.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5">
                  <RoleBadge role={a.role} compact />
                  {a.name}
                </span>
              ))}
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-col gap-0.5 text-[13px] text-muted-ink @2xl:w-[200px] @2xl:shrink-0">
          {reg.contactPhone && (
            <span className="font-display text-sm font-semibold tracking-wide text-ink tabular-nums">
              {reg.contactPhone}
            </span>
          )}
          <span className="truncate">
            {[
              reg.itemSummary,
              canManage && reg.totalAmount != null ? `NT$ ${reg.totalAmount.toLocaleString()}` : null,
              canManage && reg.couponCode ? reg.couponCode : null,
            ]
              .filter(Boolean)
              .join(" ・ ")}
          </span>
        </span>

        <span className="flex flex-col gap-0.5 @2xl:w-[104px] @2xl:shrink-0">
          <PaymentStatusBadge status={reg.paymentStatus} />
          {partiallyEntered && <span className="text-xs text-muted-ink">{partiallyEntered}</span>}
        </span>
      </button>

      {action.kind === "confirm_payment" && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => onAction(action)}
          className={cn(ACTION_BASE, "bg-butter font-bold text-ink hover:bg-butter-hover")}
        >
          {busy ? "處理中…" : "確認收款"}
        </button>
      )}
      {action.kind === "check_in" && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => onAction(action)}
          className={cn(ACTION_BASE, "bg-brand text-base font-bold text-ink hover:bg-brand-hover")}
        >
          {busy ? "處理中…" : action.count > 1 ? `入場 ${action.count}` : "入場"}
        </button>
      )}
      {action.kind === "check_in_unpaid" && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => onAction(action)}
          className={cn(
            ACTION_BASE,
            "border border-gray-300 bg-white font-medium text-ink hover:border-ink"
          )}
        >
          {busy ? "處理中…" : action.count > 1 ? `入場 ${action.count}` : "入場"}
        </button>
      )}
      {action.kind === "entered" && (
        <span
          className={cn(
            ACTION_BASE,
            "cursor-default gap-1.5 bg-brand-soft text-[13px] font-bold text-brand-strong"
          )}
        >
          <Check className="size-3.5" strokeWidth={3} />
          已入場
          {action.at && (
            <span className="font-display tabular-nums">{formatClockTime(action.at)}</span>
          )}
        </span>
      )}
      {action.kind === "none" && <span className="w-[104px] shrink-0 @2xl:w-[112px]" />}
    </div>
  );
}
