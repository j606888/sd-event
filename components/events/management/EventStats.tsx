"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useEventStats } from "@/hooks/use-event-stats";
import {
  checkInSummary,
  paymentSummary,
  roleDistribution,
  type RoleCounts,
} from "@/lib/event-stats-summary";
import type {
  CheckInFilter,
  PaymentFilter,
} from "@/lib/registration-list-filters";
import { cn } from "@/lib/utils";
import { richText } from "@/lib/rich-text";

/** 角色數字卡的底色／字色，與 RoleBadge 同一套 */
const ROLE_TILE: Record<keyof RoleCounts, string> = {
  Leader: "bg-leader text-white",
  Follower: "bg-follower-soft text-follower",
  "Not sure": "bg-field text-muted-ink",
};

/** 角色顯示名稱的翻譯 key（events.stats.role.*） */
const ROLE_LABEL_KEY: Record<keyof RoleCounts, "Leader" | "Follower" | "notSure"> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "notSure",
};

const CARD = "surface-card p-5 sm:p-6";

/** 款項明細各列點下去要套用的報名者篩選。 */
const PAYMENT_DRILL_DOWN: Record<"confirmed" | "reported" | "pending", PaymentFilter> = {
  confirmed: "confirmed",
  reported: "reported",
  pending: "pending",
};

type RegistrationFilterRequest = {
  payment?: PaymentFilter;
  checkIn?: CheckInFilter;
  purchaseItemId?: number;
};

type EventStatsProps = {
  eventId: string;
  /** 帶入時，款項、入場與報名項目可點擊，跳到「報名者」分頁並套用篩選。 */
  onFilterRegistrations?: (filters: RegistrationFilterRequest) => void;
};

const money = (n: number) => `NT$ ${n.toLocaleString()}`;

// 總人數：數字與單位各自一個元素（events.units.people）
const totalNumber = (chunks: ReactNode) => <span>{richText(chunks)}</span>;
const totalUnit = (chunks: ReactNode) => (
  <span className="text-sm font-medium text-muted-ink">{richText(chunks)}</span>
);

export function EventStats({ eventId, onFilterRegistrations }: EventStatsProps) {
  const { data, isLoading, error } = useEventStats(eventId);
  const t = useTranslations("events.stats");
  const tEvents = useTranslations("events");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return <p className="py-12 text-sm text-gray-500">{t("loading")}</p>;
  }

  if (error) {
    return (
      <p className="py-8 text-sm text-red-600">
        {error instanceof Error ? error.message : t("loadFailed")}
      </p>
    );
  }

  if (!data) return null;

  const { roleCounts, totalAttendees, checkedInCount } = data;
  const paymentAmountTotals = data.paymentAmountTotals ?? { confirmed: 0, reported: 0, pending: 0 };
  const paymentCounts = data.paymentCounts ?? { confirmed: 0, reported: 0, pending: 0 };
  const purchaseItemSummary = data.purchaseItemSummary ?? [];
  const discountTotal = data.discountTotal ?? 0;

  const roles = roleDistribution(roleCounts);
  const checkIn = checkInSummary(totalAttendees, checkedInCount);
  const payments = paymentSummary(paymentAmountTotals, paymentCounts);
  // 項目統計是折扣前金額，扣掉折抵後就會等於上方的「全部付款可收」。
  const itemsSubtotal = purchaseItemSummary.reduce((sum, item) => sum + item.revenue, 0);

  /** 沒帶 handler 時退化成純文字，不會出現點了沒反應的按鈕。 */
  const drillDown = (filters: RegistrationFilterRequest) =>
    onFilterRegistrations ? () => onFilterRegistrations(filters) : undefined;

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* 報名人數：只給數字，Leader / Follower 差多少一眼看得出來 */}
      <section className={CARD}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">{t("headcount")}</h3>
          <div className="font-display text-4xl font-bold leading-none text-ink tabular-nums">
            {tEvents.rich("units.people", { count: roles.total, num: totalNumber, unit: totalUnit })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {roles.rows.map((row) => (
            <div key={row.key} className={cn("rounded-xl px-3.5 py-3", ROLE_TILE[row.key])}>
              <div className="text-[13px] font-bold">{t(`role.${ROLE_LABEL_KEY[row.key]}`)}</div>
              <div className="font-display text-[32px] font-bold leading-tight tabular-nums">
                {row.count}
              </div>
              <div className="text-xs tabular-nums opacity-90">{row.pct}%</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-ink">{t("hiddenNote")}</p>
      </section>

      {/* 入場 */}
      <section className={CARD}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">{t("checkIn")}</h3>
          <div className="text-xs text-muted-ink">
            <span>{t("checkInRate")}</span>{" "}
            <span className="font-display text-sm font-semibold text-ink tabular-nums">
              {checkIn.pct}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label={t("checkedIn")}
            value={checkIn.entered}
            className="bg-brand text-ink"
            onClick={drillDown({ checkIn: "all_entered" })}
          />
          <StatTile
            label={t("notCheckedIn")}
            value={checkIn.notEntered}
            className="bg-field text-ink"
            onClick={drillDown({ checkIn: "not_all" })}
          />
        </div>
      </section>

      {/* 款項：入帳、在路上、全部收齊的上限 */}
      <section className={CARD}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink">{t("payments")}</h3>
          <div className="text-xs text-muted-ink">
            <span>{t("collectProgress")}</span>{" "}
            <span className="font-display text-sm font-semibold text-ink tabular-nums">
              {payments.collectedPct}%
            </span>
          </div>
        </div>

        <div>
          {payments.rows.map((row) => {
            const onClick = drillDown({ payment: PAYMENT_DRILL_DOWN[row.key] });
            const content = (
              <>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="flex-1 text-left font-medium text-ink">
                  {t(`paymentRow.${row.key}`)}
                </span>
                <span className="text-muted-ink tabular-nums">
                  {tCommon("registrations", { count: row.count })}
                </span>
                <span className="min-w-[112px] text-right font-display text-lg font-bold text-ink tabular-nums">
                  {money(row.amount)}
                </span>
              </>
            );

            return (
              <div key={row.key} className="border-b border-hairline">
                {onClick ? (
                  <button
                    type="button"
                    onClick={onClick}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-md text-sm transition-colors hover:bg-paper"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex min-h-12 items-center gap-2.5 text-sm">{content}</div>
                )}
              </div>
            );
          })}

          <div className="flex min-h-12 items-center gap-2.5 text-sm">
            <span className="flex-1 font-bold text-ink">{t("expectedTotal")}</span>
            <span className="text-muted-ink tabular-nums">
              {tCommon("registrations", { count: payments.totalCount })}
            </span>
            <span className="min-w-[112px] text-right font-display text-lg font-bold text-ink tabular-nums">
              {money(payments.expectedTotal)}
            </span>
          </div>
        </div>
      </section>

      <section className={CARD}>
        <h3 className="mb-1 font-display text-base font-bold text-ink">{t("items")}</h3>
        <p className="mb-3 text-xs text-gray-400">{t("itemsNote")}</p>
        {purchaseItemSummary.length === 0 ? (
          <p className="text-sm text-gray-500">{t("itemsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {purchaseItemSummary.map((item) => {
              // 點下去看是誰報了這個項目
              const onClick = drillDown({ purchaseItemId: item.id });
              const content = (
                <>
                  <span className="text-left text-gray-700">{item.name}</span>
                  <span className="shrink-0">
                    <span className="font-medium text-gray-900 tabular-nums">
                      {tCommon("people", { count: item.attendeeCount })}
                    </span>
                    <span className="ml-3 text-gray-500 tabular-nums">
                      {money(item.revenue)}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={item.id}>
                  {onClick ? (
                    <button
                      type="button"
                      onClick={onClick}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md text-sm transition-colors hover:bg-paper"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {purchaseItemSummary.length > 0 && (
          <dl className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-[13px]">
            <div className="flex items-baseline justify-between">
              <dt className="text-gray-500">{t("itemsSubtotal")}</dt>
              <dd className="tabular-nums text-gray-700">{money(itemsSubtotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-gray-500">{t("couponDiscount")}</dt>
              <dd className="tabular-nums text-gray-700">
                {discountTotal > 0 ? `− ${money(discountTotal)}` : money(0)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-medium text-ink">{t("netDue")}</dt>
              <dd className="font-display text-[15px] font-semibold text-ink tabular-nums">
                {money(itemsSubtotal - discountTotal)}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: number;
  className: string;
  onClick?: () => void;
};

/** 入場的兩個大數字；帶 onClick 時整格可點，跳到報名者分頁。 */
function StatTile({ label, value, className, onClick }: StatTileProps) {
  const t = useTranslations("events.stats");
  const inner = (
    <>
      <div className="text-[13px] font-bold">{label}</div>
      <div className="font-display text-[32px] font-bold leading-tight tabular-nums">{value}</div>
      {onClick && <div className="text-xs opacity-80">{t("viewList")}</div>}
    </>
  );
  const base = cn("rounded-xl px-3.5 py-3 text-left", className);

  if (!onClick) return <div className={base}>{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "cursor-pointer transition-opacity hover:opacity-90")}
    >
      {inner}
    </button>
  );
}
