"use client";

import { useQuery } from "@tanstack/react-query";
import { RoleBalanceMeter } from "@/components/events/RoleBalanceMeter";
import {
  checkInSummary,
  paymentSummary,
  roleDistribution,
  type PaymentAmountTotals,
  type PaymentCounts,
  type RoleCounts,
} from "@/lib/event-stats-summary";
import type {
  CheckInFilter,
  PaymentFilter,
} from "@/lib/registration-list-filters";

type StatsData = {
  roleCounts: RoleCounts;
  totalAttendees: number;
  checkedInCount: number;
  paymentAmountTotals: PaymentAmountTotals;
  paymentCounts: PaymentCounts;
  purchaseItemSummary: Array<{
    id: number;
    name: string;
    amount: number;
    attendeeCount: number;
    revenue: number;
  }>;
};

/** 款項明細各列點下去要套用的報名者篩選。 */
const PAYMENT_DRILL_DOWN: Record<"confirmed" | "reported" | "pending", PaymentFilter> = {
  confirmed: "confirmed",
  reported: "reported",
  pending: "pending",
};

type RegistrationFilterRequest = {
  payment?: PaymentFilter;
  checkIn?: CheckInFilter;
};

type EventStatsProps = {
  eventId: string;
  /** 帶入時，款項與入場的數字可點擊，跳到「報名者」分頁並套用篩選。 */
  onFilterRegistrations?: (filters: RegistrationFilterRequest) => void;
};

const money = (n: number) => `NT$ ${n.toLocaleString()}`;

export function EventStats({ eventId, onFilterRegistrations }: EventStatsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["eventStats", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("無法載入統計");
      return res.json() as Promise<StatsData>;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return <p className="py-12 text-sm text-gray-500">載入統計中…</p>;
  }

  if (error) {
    return (
      <p className="py-8 text-sm text-red-600">
        {error instanceof Error ? error.message : "載入失敗"}
      </p>
    );
  }

  if (!data) return null;

  const {
    roleCounts,
    totalAttendees,
    checkedInCount,
    paymentAmountTotals,
    paymentCounts,
    purchaseItemSummary,
  } = data;

  const roles = roleDistribution(roleCounts);
  const checkIn = checkInSummary(totalAttendees, checkedInCount);
  const payments = paymentSummary(paymentAmountTotals, paymentCounts);

  /** 沒帶 handler 時退化成純文字，不會出現點了沒反應的按鈕。 */
  const drillDown = (filters: RegistrationFilterRequest) =>
    onFilterRegistrations ? () => onFilterRegistrations(filters) : undefined;

  return (
    <div className="flex max-w-4xl flex-col divide-y divide-hairline">
      {/* Signature: Leader / Follower balance — the hero stat for a dance event */}
      <section className="pb-8">
        <div className="mb-5 flex items-baseline justify-between">
          <h3 className="font-display text-base font-bold text-ink">舞伴平衡</h3>
          <div className="text-xs text-gray-500">
            報名人數{" "}
            <span className="font-display text-[15px] font-semibold text-ink tabular-nums">
              {roles.total}
            </span>{" "}
            人
          </div>
        </div>

        {roles.total === 0 ? (
          <p className="py-6 text-sm text-gray-500">尚無參加者資料</p>
        ) : (
          <>
            <RoleBalanceMeter
              leader={roleCounts.Leader}
              follower={roleCounts.Follower}
              notSure={roleCounts["Not sure"]}
              size="lg"
            />
            <ul className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-7">
              {roles.rows.map((row) => (
                <li key={row.key} className="flex items-center gap-2 text-[13px]">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span className="flex-1 text-gray-600 sm:flex-none">{row.label}</span>
                  <span className="order-3 w-11 text-right font-medium text-ink tabular-nums sm:order-none sm:w-auto">
                    {row.count} 人
                  </span>
                  <span className="text-gray-400 tabular-nums">{row.pct}%</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-4 text-xs text-gray-400">
          比例以報名人數計，僅包含「未隱藏」的報名資料。
        </p>
      </section>

      {/* Check-in — headcount only; the role split after the door doesn't matter */}
      <section className="py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold text-ink">入場狀況</h3>
          <div className="font-display text-sm font-semibold text-ink tabular-nums">
            {checkIn.pct}%
          </div>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="bg-ink transition-all duration-500"
            style={{ width: `${checkIn.pct}%` }}
          />
        </div>

        <div className="mt-4 grid max-w-md grid-cols-2 divide-x divide-hairline">
          <StatColumn
            className="pr-6"
            dotClassName="bg-ink"
            label="已入場"
            value={checkIn.entered}
            valueClassName="text-ink"
            onClick={drillDown({ checkIn: "all_entered" })}
          />
          <StatColumn
            className="pl-6"
            dotClassName="bg-gray-300"
            label="未入場"
            value={checkIn.notEntered}
            valueClassName="text-gray-400"
            onClick={drillDown({ checkIn: "none" })}
          />
        </div>
      </section>

      {/* Money — what's banked, what's in flight, and the ceiling if everyone pays */}
      <section className="py-6">
        <div className="mb-3.5 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold text-ink">款項</h3>
          <div className="text-xs text-gray-500">
            收款進度{" "}
            <span className="font-display text-sm font-semibold text-ink tabular-nums">
              {payments.collectedPct}%
            </span>
          </div>
        </div>

        <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="font-display text-[38px] leading-none font-semibold text-green-700 tabular-nums">
            {money(payments.collected)}
          </div>
          <div className="text-[13px] text-gray-500">已入帳</div>
        </div>

        <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-gray-200">
          {payments.rows
            .filter((row) => row.pct > 0)
            .map((row) => (
              <div
                key={row.key}
                className="transition-all duration-500"
                style={{ width: `${row.pct}%`, backgroundColor: row.color }}
              />
            ))}
        </div>

        <div className="mt-4">
          {payments.rows.map((row) => {
            const onClick = drillDown({ payment: PAYMENT_DRILL_DOWN[row.key] });
            const content = (
              <>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="flex-1 text-left text-gray-600">{row.label}</span>
                <span className="text-gray-400 tabular-nums">{row.count} 筆</span>
                <span className="min-w-[92px] text-right font-display text-[15px] font-semibold text-ink tabular-nums">
                  {money(row.amount)}
                </span>
              </>
            );

            return (
              <div key={row.key} className="border-b border-hairline/70">
                {onClick ? (
                  <button
                    type="button"
                    onClick={onClick}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md py-2.5 text-[13px] transition-colors hover:bg-gray-50"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 py-2.5 text-[13px]">
                    {content}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-baseline gap-2 pt-3 text-[13px]">
            <span className="flex-1 font-medium text-ink">全部付款可收</span>
            <span className="text-gray-400 tabular-nums">{payments.totalCount} 筆</span>
            <span className="min-w-[92px] text-right font-display text-xl font-semibold text-ink tabular-nums">
              {money(payments.expectedTotal)}
            </span>
          </div>
        </div>
      </section>

      <section className="py-6">
        <h3 className="mb-1 font-display text-sm font-bold text-ink">報名項目統計</h3>
        <p className="mb-3 text-xs text-gray-400">
          金額為各筆報名成交價加總（含時段價，未扣折扣碼折抵）
        </p>
        {purchaseItemSummary.length === 0 ? (
          <p className="text-sm text-gray-500">尚無報名項目資料</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {purchaseItemSummary.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-gray-700">{item.name}</span>
                <span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {item.attendeeCount} 人
                  </span>
                  <span className="ml-3 text-gray-500 tabular-nums">
                    {money(item.revenue)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type StatColumnProps = {
  label: string;
  value: number;
  className?: string;
  dotClassName: string;
  valueClassName: string;
  onClick?: () => void;
};

/** 入場的兩個大數字；帶 onClick 時整欄可點，跳到報名者分頁。 */
function StatColumn({
  label,
  value,
  className = "",
  dotClassName,
  valueClassName,
  onClick,
}: StatColumnProps) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <span className={`size-[7px] rounded-full ${dotClassName}`} aria-hidden />
        {label}
      </div>
      <div
        className={`mt-1 font-display text-4xl font-semibold tabular-nums ${valueClassName}`}
      >
        {value}
      </div>
    </>
  );

  if (!onClick) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        className="w-full cursor-pointer rounded-md py-1 text-left transition-colors hover:bg-gray-50"
      >
        {inner}
      </button>
    </div>
  );
}
