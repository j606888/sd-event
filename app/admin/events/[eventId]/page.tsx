"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminEventDetail } from "@/lib/api/admin";

const PAYMENT_LABELS: Record<string, string> = {
  pending: "未付款",
  reported: "已回報",
  confirmed: "已確認",
  rejected: "已退回",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const id = Number(eventId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: () => getAdminEventDetail(id),
  });

  if (isLoading) return <p className="text-sm text-gray-500">載入中…</p>;
  if (error || !data)
    return <p className="text-sm text-red-500">無法載入活動</p>;

  const { event, meta, stats, items, tiers, registrations } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/events"
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-3.5" />
          所有活動
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
          {event.status === "draft" && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              草稿
            </span>
          )}
          <a
            href={`/e/${event.publicKey}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            公開頁面
            <ExternalLink className="size-3" />
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {meta.teamName} · {meta.owner.name}（{meta.owner.email}）·{" "}
          {formatDateTime(event.startAt)}
          {meta.locationName ? ` · ${meta.locationName}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="報名筆數" value={stats.registrationCount} />
        <Stat
          label="參加者"
          value={`${stats.checkedInCount} / ${stats.attendeeCount}`}
          hint="已報到 / 總人數"
        />
        <Stat
          label="Leader / Follower"
          value={`${stats.leaderCount} / ${stats.followerCount}`}
          hint={`未定 ${stats.notSureCount}`}
        />
        <Stat
          label="金額"
          value={`NT$ ${stats.revenue.toLocaleString()}`}
          hint={`已確認 NT$ ${stats.confirmedRevenue.toLocaleString()}`}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-900">
          票種與時段
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {tiers.length > 0 && (
            <p className="mb-3 text-xs text-gray-500">
              時段：
              {tiers
                .map(
                  (t) =>
                    `${t.name}${t.endsAt ? `（至 ${formatDateTime(t.endsAt)}）` : "（現場/預設）"}`
                )
                .join(" · ")}
            </p>
          )}
          <ul className="flex flex-col gap-1 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4">
                <span className={i.hidden ? "text-gray-400 line-through" : "text-gray-800"}>
                  {i.name}
                </span>
                <span className="tabular-nums text-gray-600">
                  NT$ {i.amount.toLocaleString()}
                </span>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-sm text-gray-500">尚無票種</li>
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-900">
          報名紀錄（{registrations.length}）
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">聯絡人</th>
                <th className="px-4 py-3">參加者</th>
                <th className="px-4 py-3">票種</th>
                <th className="px-4 py-3">付款</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3">報名時間</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {r.contactName}
                      {r.hidden && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          （已隱藏）
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.contactEmail || r.contactPhone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.attendees
                      .map(
                        (a) =>
                          `${a.name}（${a.role}${a.checkedIn ? " ✓" : ""}）`
                      )
                      .join("、") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.purchaseItems.map((i) => i.name).join("、") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {PAYMENT_LABELS[r.paymentStatus] ?? r.paymentStatus}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    NT$ {r.totalAmount.toLocaleString()}
                    {r.couponCode && (
                      <div className="text-xs text-gray-400">
                        {r.couponCode} −{r.discountAmount}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDateTime(r.createdAt)}
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    尚無報名
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
