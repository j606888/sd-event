"use client";

import { useEventStats } from "@/hooks/use-event-stats";
import { checkInSummary, paymentSummary } from "@/lib/event-stats-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type EventNumbersStripProps = {
  eventId: string;
  onShowAll: () => void;
  onShowNotEntered: () => void;
  onShowAwaitingConfirmation: () => void;
};

const money = (n: number) => `NT$ ${n.toLocaleString()}`;

const CELL = "flex flex-col gap-1.5 rounded-2xl border px-4 py-3.5 text-left";
const LABEL = "text-xs";
const NUMBER = "font-display text-[28px] font-bold leading-none tabular-nums";

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

  const { roleCounts, totalAttendees, checkedInCount, paymentAmountTotals, paymentCounts } = data;
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
        className={cn(CELL, "cursor-pointer border-hairline bg-white transition-colors hover:border-brand")}
      >
        <span className={cn(LABEL, "text-muted-ink")}>報名人數</span>
        <span className={cn(NUMBER, "text-ink")}>
          {totalAttendees}
          <span className="text-sm font-medium text-muted-ink"> 人</span>
        </span>
        <span className="flex flex-wrap gap-1.5 text-xs font-bold">
          <span className="rounded-md bg-leader px-1.5 py-0.5 text-white">L {roleCounts.Leader}</span>
          <span className="rounded-md bg-follower-soft px-1.5 py-0.5 text-follower">
            F {roleCounts.Follower}
          </span>
          <span className="rounded-md bg-field px-1.5 py-0.5 text-muted-ink">
            不確定 {roleCounts["Not sure"]}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onShowNotEntered}
        className={cn(CELL, "cursor-pointer border-brand bg-brand transition-colors hover:bg-brand-hover")}
      >
        <span className={cn(LABEL, "text-ink/80")}>已入場</span>
        <span className={cn(NUMBER, "text-ink")}>
          {checkIn.entered}
          <span className="text-sm font-medium text-ink/80"> / {totalAttendees} 人</span>
        </span>
        <span className={cn(LABEL, "text-ink/80")}>還有 {checkIn.notEntered} 人未入場 →</span>
      </button>

      {payments && reported && (
        <>
          <button
            type="button"
            onClick={onShowAwaitingConfirmation}
            className={cn(
              CELL,
              "cursor-pointer border-hairline bg-white transition-colors hover:border-butter"
            )}
          >
            <span className={cn(LABEL, "text-muted-ink")}>待確認收款</span>
            <span className={cn(NUMBER, reported.count > 0 ? "text-butter-ink" : "text-muted-ink")}>
              {reported.count}
              <span className="text-sm font-medium text-muted-ink"> 筆</span>
            </span>
            <span className={cn(LABEL, "text-muted-ink")}>
              {reported.count > 0 ? `${money(reported.amount)} 等你核對 →` : "都對完了"}
            </span>
          </button>

          <div className={cn(CELL, "border-hairline bg-white")}>
            <span className={cn(LABEL, "text-muted-ink")}>已入帳</span>
            <span className={cn(NUMBER, "text-brand-strong")}>{money(payments.collected)}</span>
            <span className={cn(LABEL, "text-muted-ink")}>
              全部付款可收 {money(payments.expectedTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
