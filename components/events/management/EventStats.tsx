"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleBalanceMeter } from "@/components/events/RoleBalanceMeter";

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

const COLORS = ["#3e7cb1", "#e0765c", "#b4b4b4"];

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
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
        載入統計中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-red-50 py-8 text-center text-sm text-red-600">
        {error instanceof Error ? error.message : "載入失敗"}
      </div>
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
    <div className="space-y-6">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        統計僅包含「未隱藏」的報名資料。
      </div>

      {/* Signature: Leader / Follower balance — the hero stat for a dance event */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">舞伴平衡</h3>
          <div className="flex rounded-full bg-gray-100 p-0.5 text-xs">
            {(
              [
                { value: "registered", label: "報名" },
                { value: "checkedIn", label: "已入場" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBalanceMode(opt.value)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  balanceMode === opt.value
                    ? "bg-white text-ink shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <RoleBalanceMeter
          leader={leaderN}
          follower={followerN}
          notSure={balanceCounts["Not sure"]}
          size="lg"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">總參加人數</div>
          <div className="font-display text-3xl font-semibold text-ink">{totalAttendees}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">已入場</div>
          <div className="font-display text-3xl font-semibold text-ink">{checkedInCount}</div>
        </div>
      </div>

      {/* Role breakdown — proportion of all three roles */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-medium text-gray-700">角色分布</h3>
        {totalAttendees === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">尚無參加者資料</p>
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
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
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
                    <span className="font-medium text-gray-900">{count} 人</span>
                  </li>
                )
              )}
            </ul>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-sm text-green-700">已入帳（已確認）</div>
          <div className="text-2xl font-semibold text-green-900">
            NT$ {paymentAmountTotals.confirmed.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-700">處理中（待確認）</div>
          <div className="text-2xl font-semibold text-amber-900">
            NT$ {paymentAmountTotals.reported.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-700">應收未收（尚未付款）</div>
          <div className="text-2xl font-semibold text-slate-900">
            NT$ {paymentAmountTotals.pending.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-medium text-gray-700">報名項目統計</h3>
        <p className="mb-3 text-xs text-gray-400">
          金額為各筆報名成交價加總（含時段價，未扣折扣碼折抵）
        </p>
        {purchaseItemSummary.length === 0 ? (
          <p className="text-sm text-gray-500">尚無報名項目資料</p>
        ) : (
          <ul className="space-y-2">
            {purchaseItemSummary.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">{item.name}</span>
                <span>
                  <span className="font-medium text-gray-900">
                    {item.attendeeCount} 人
                  </span>
                  <span className="ml-3 text-gray-500">
                    NT$ {item.revenue.toLocaleString()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
