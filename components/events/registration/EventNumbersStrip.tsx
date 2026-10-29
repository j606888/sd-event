"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useEventStats } from "@/hooks/use-event-stats";
import { checkInSummary, paymentSummary } from "@/lib/event-stats-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { richText } from "@/lib/rich-text";

type EventNumbersStripProps = {
  eventId: string;
  onShowAll: () => void;
  onShowNotEntered: () => void;
  onShowAwaitingConfirmation: () => void;
};

const money = (n: number) => `NT$ ${n.toLocaleString()}`;

// 會變動的數字要是元素裡唯一的字串：跟其他節點並排的話，頁面被 Google 翻譯後
// React 改到的是已被換掉的舊文字節點，畫面上的數字會停在翻譯當下。

// 手機上數字列要矮，搜尋框才會留在第一屏；金額兩格手機不顯示（統計分頁一點就到）
const CELL = "flex flex-col gap-1 rounded-2xl border px-3.5 py-2.5 text-left sm:gap-1.5 sm:px-4 sm:py-3.5";
const LABEL = "text-xs";
const NUMBER = "font-display text-2xl font-bold leading-none tabular-nums sm:text-[28px]";

// events.units.* 的數字與單位標籤：各自一個元素
const num = (chunks: ReactNode) => <span>{richText(chunks)}</span>;
const mutedUnit = (chunks: ReactNode) => (
  <span className="text-sm font-medium text-muted-ink">{richText(chunks)}</span>
);
const inkUnit = (chunks: ReactNode) => (
  <span className="text-sm font-medium text-ink/80">{richText(chunks)}</span>
);

/**
 * 報名者頁最上方的一排數字：不用切到統計分頁就知道來了多少人、還有幾筆款要對。
 * 驗票人員的 stats 回應不含金額，所以只會出現前兩格。
 */
export function EventNumbersStrip({
  eventId,
  onShowAll,
  onShowNotEntered,
  onShowAwaitingConfirmation,
}: EventNumbersStripProps) {
  const { data, isLoading } = useEventStats(eventId);
  const t = useTranslations("events");
  const tPayment = useTranslations("enums.paymentStatus");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const {
    roleCounts,
    totalAttendees,
    checkedInCount,
    paymentAmountTotals,
    paymentCounts,
    refundedCount = 0,
    refundedAmount = 0,
  } = data;
  const checkIn = checkInSummary(totalAttendees, checkedInCount);
  const payments =
    paymentAmountTotals && paymentCounts
      ? paymentSummary(paymentAmountTotals, paymentCounts)
      : null;
  const reported = payments?.rows.find((row) => row.key === "reported");

  return (
    <div className={cn("grid grid-cols-2 gap-3", payments && "lg:grid-cols-4")}>
      <button
        type="button"
        onClick={onShowAll}
        className={cn(CELL, "cursor-pointer border-card-border bg-white transition-colors hover:border-brand")}
      >
        <span className={cn(LABEL, "text-muted-ink")}>{t("strip.headcount")}</span>
        <span className={cn(NUMBER, "text-ink")}>
          {t.rich("units.people", { count: totalAttendees, num, unit: mutedUnit })}
        </span>
        <span className="flex flex-wrap gap-1.5 text-xs font-bold">
          <span className="rounded-md bg-leader px-1.5 py-0.5 text-white">{`L ${roleCounts.Leader}`}</span>
          <span className="rounded-md bg-follower-soft px-1.5 py-0.5 text-follower">
            {`F ${roleCounts.Follower}`}
          </span>
          <span className="rounded-md bg-field px-1.5 py-0.5 text-muted-ink">
            {t("strip.notSure", { count: roleCounts["Not sure"] })}
          </span>
          {refundedCount > 0 && (
            <span className="py-0.5 font-medium text-muted-ink">
              {t("strip.refunded", { count: refundedCount })}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onShowNotEntered}
        className={cn(CELL, "cursor-pointer border-brand bg-brand transition-colors hover:bg-brand-hover")}
      >
        <span className={cn(LABEL, "text-ink/80")}>{t("strip.checkedIn")}</span>
        <span className={cn(NUMBER, "text-ink")}>
          {t.rich("units.ofTotalPeople", {
            count: checkIn.entered,
            total: totalAttendees,
            num,
            unit: inkUnit,
          })}
        </span>
        <span className={cn(LABEL, "text-ink/80")}>
          {t("strip.notCheckedInRemaining", { count: checkIn.notEntered })}
        </span>
      </button>

      {payments && reported && (
        <>
          <button
            type="button"
            onClick={onShowAwaitingConfirmation}
            className={cn(
              CELL,
              "hidden cursor-pointer border-card-border bg-white transition-colors hover:border-butter sm:flex"
            )}
          >
            <span className={cn(LABEL, "text-muted-ink")}>{tPayment("reported")}</span>
            <span className={cn(NUMBER, reported.count > 0 ? "text-butter-ink" : "text-muted-ink")}>
              {t.rich("units.registrations", { count: reported.count, num, unit: mutedUnit })}
            </span>
            <span className={cn(LABEL, "text-muted-ink")}>
              {reported.count > 0
                ? t("strip.toVerify", { amount: money(reported.amount) })
                : t("strip.allVerified")}
            </span>
          </button>

          <div className={cn(CELL, "hidden border-card-border bg-white sm:flex")}>
            <span className={cn(LABEL, "text-muted-ink")}>{t("strip.collected")}</span>
            <span className={cn(NUMBER, "text-brand-strong")}>{money(payments.collected)}</span>
            <span className={cn(LABEL, "text-muted-ink")}>
              {refundedAmount > 0
                ? t("strip.refundedExcluded", { amount: money(refundedAmount) })
                : t("strip.expectedTotal", { amount: money(payments.expectedTotal) })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
