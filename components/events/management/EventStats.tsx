"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleBalanceMeter } from "@/components/events/RoleBalanceMeter";
import { SegmentedToggle } from "@/components/ui/segmented";

type RoleCounts = {
  Leader: number;
  Follower: number;
  "Not sure": number;
};

type StatsData = {
  roleCounts: RoleCounts;
  checkedInRoleCounts: RoleCounts;
  totalAttendees: number;
  checkedInCount: number;
  paymentAmountTotals: {
    confirmed: number;
    reported: number;
    pending: number;
  };
  purchaseItemSummary: Array<{
    id: number;
    name: string;
    amount: number;
    attendeeCount: number;
    revenue: number;
  }>;
};

const ROLE_LABELS: Record<keyof RoleCounts, string> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "尚未確定",
};

// 角色分布配色沿用品牌 token：Leader 藍／Follower 珊瑚／中性灰
const COLORS = ["var(--leader)", "var(--follower)", "#b4b4b4"];

type EventStatsProps = {
  eventId: string;
};

export function EventStats({ eventId }: EventStatsProps) {
  const [balanceMode, setBalanceMode] = useState<"registered" | "checkedIn">(
    "registered"
  );
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
    checkedInRoleCounts,
    totalAttendees,
    checkedInCount,
    paymentAmountTotals,
    purchaseItemSummary,
  } = data;

  // Lead/Follow 平衡：可切換「報名」與「已入場」兩種視角
  const balanceCounts =
    balanceMode === "checkedIn" ? checkedInRoleCounts ?? roleCounts : roleCounts;
  const leaderN = balanceCounts.Leader;
  const followerN = balanceCounts.Follower;

  return (
    <div className="flex max-w-4xl flex-col divide-y divide-hairline">
      {/* Signature: Leader / Follower balance — the hero stat for a dance event */}
      <section className="pb-8">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink">舞伴平衡</h3>
          <SegmentedToggle
            value={balanceMode}
            onChange={setBalanceMode}
            options={[
              { value: "registered", label: "報名" },
              { value: "checkedIn", label: "已入場" },
            ]}
          />
        </div>
        <RoleBalanceMeter
          leader={leaderN}
          follower={followerN}
          notSure={balanceCounts["Not sure"]}
          size="lg"
        />
        <p className="mt-4 text-xs text-gray-400">統計僅包含「未隱藏」的報名資料。</p>
      </section>

      {/* Headline numbers — editorial stat row */}
      <section className="grid max-w-md grid-cols-2 divide-x divide-hairline py-6">
        <div className="pr-6">
          <div className="text-xs font-medium tracking-wide text-gray-500">總參加人數</div>
          <div className="font-display text-4xl font-semibold text-ink tabular-nums">
            {totalAttendees}
          </div>
        </div>
        <div className="pl-6">
          <div className="text-xs font-medium tracking-wide text-gray-500">已入場</div>
          <div className="font-display text-4xl font-semibold text-ink tabular-nums">
            {checkedInCount}
          </div>
        </div>
      </section>

      {/* Role breakdown — proportion of all three roles */}
      <section className="py-6">
        <h3 className="mb-4 font-display text-sm font-bold text-ink">角色分布</h3>
        {totalAttendees === 0 ? (
          <p className="py-6 text-sm text-gray-500">尚無參加者資料</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              {(Object.entries(roleCounts) as [keyof RoleCounts, number][]).map(
                ([role, count], index) =>
                  count > 0 ? (
                    <div
                      key={role}
                      title={`${ROLE_LABELS[role]} ${count}`}
                      style={{
                        width: `${(count / totalAttendees) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  ) : null
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {(Object.entries(roleCounts) as [keyof RoleCounts, number][]).map(
                ([role, count], index) => (
                  <li
                    key={role}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-gray-700">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {ROLE_LABELS[role]}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">{count} 人</span>
                  </li>
                )
              )}
            </ul>
          </>
        )}
      </section>

      {/* Money — flat columns with status dots instead of tinted boxes */}
      <section className="py-6">
        <h3 className="mb-4 font-display text-sm font-bold text-ink">款項</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-0 md:divide-x md:divide-hairline">
          <div className="md:pr-6">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="size-1.5 rounded-full bg-green-500" aria-hidden />
              已入帳（已確認）
            </div>
            <div className="font-display text-2xl font-semibold text-green-700 tabular-nums">
              NT$ {paymentAmountTotals.confirmed.toLocaleString()}
            </div>
          </div>
          <div className="md:px-6">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              處理中（待確認）
            </div>
            <div className="font-display text-2xl font-semibold text-amber-600 tabular-nums">
              NT$ {paymentAmountTotals.reported.toLocaleString()}
            </div>
          </div>
          <div className="md:px-6">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="size-1.5 rounded-full bg-gray-300" aria-hidden />
              應收未收（尚未付款）
            </div>
            <div className="font-display text-2xl font-semibold text-gray-600 tabular-nums">
              NT$ {paymentAmountTotals.pending.toLocaleString()}
            </div>
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
                    NT$ {item.revenue.toLocaleString()}
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
