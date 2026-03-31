"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

type RoleCounts = {
  Leader: number;
  Follower: number;
  "Not sure": number;
};

type StatsData = {
  roleCounts: RoleCounts;
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
  }>;
};

const ROLE_LABELS: Record<keyof RoleCounts, string> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "尚未確定",
};

const COLORS = ["#5295BC", "#ED8E8E", "#B4B4B4"];

type EventStatsProps = {
  eventId: string;
};

export function EventStats({ eventId }: EventStatsProps) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/events/${eventId}/stats`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("無法載入統計");
        return res.json();
      })
      .then((stats: StatsData) => {
        if (!cancelled) setData(stats);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "載入失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
        載入統計中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-red-50 py-8 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const {
    roleCounts,
    totalAttendees,
    checkedInCount,
    paymentAmountTotals,
    purchaseItemSummary,
  } = data;
  const chartData = (Object.entries(roleCounts) as [keyof RoleCounts, number][]).map(
    ([role, value], index) => ({
      name: ROLE_LABELS[role],
      value,
      fill: COLORS[index % COLORS.length],
    })
  ).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        統計僅包含「未隱藏」的報名資料。
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">總參加人數</div>
          <div className="text-2xl font-semibold text-gray-900">{totalAttendees}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">已入場</div>
          <div className="text-2xl font-semibold text-gray-900">{checkedInCount}</div>
        </div>
      </div>


      {/* Role breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">角色分布</h3>
        {totalAttendees === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">尚無參加者資料</p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label={({ name, value }) => `${name} ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => [`${value ?? 0} 人`, "人數"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {(Object.entries(roleCounts) as [keyof RoleCounts, number][]).map(([role, count]) => (
                <li
                  key={role}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{ROLE_LABELS[role]}</span>
                  <span className="font-medium text-gray-900">{count} 人</span>
                </li>
              ))}
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
        <h3 className="mb-3 text-sm font-medium text-gray-700">報名項目統計</h3>
        {purchaseItemSummary.length === 0 ? (
          <p className="text-sm text-gray-500">尚無報名項目資料</p>
        ) : (
          <ul className="space-y-2">
            {purchaseItemSummary.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {item.name} ${item.amount.toLocaleString()}
                </span>
                <span className="font-medium text-gray-900">
                  {item.attendeeCount} 人
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
