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

  const { roleCounts, totalAttendees, checkedInCount } = data;
  const chartData = (Object.entries(roleCounts) as [keyof RoleCounts, number][]).map(
    ([role, value], index) => ({
      name: ROLE_LABELS[role],
      value,
      fill: COLORS[index % COLORS.length],
    })
  ).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
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
                  <Tooltip formatter={(value: number) => [`${value} 人`, "人數"]} />
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
    </div>
  );
}
