"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminEvents, type AdminEvent } from "@/lib/api/admin";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function AdminEventsList() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam ? Number(userIdParam) : undefined;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events", userId ?? null],
    queryFn: () => getAdminEvents(userId ? { userId } : undefined),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">活動</h1>
        <p className="mt-1 text-sm text-gray-500">
          {userId ? "此使用者建立的活動" : `全站共 ${events.length} 場活動`}
          {userId && (
            <>
              {" · "}
              <Link href="/admin/events" className="text-brand underline">
                顯示全部
              </Link>
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">載入中…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">沒有活動</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">活動</th>
                <th className="px-4 py-3">團隊 / 建立者</th>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3 text-right">報名</th>
                <th className="px-4 py-3 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: AdminEvent) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${e.id}`}
                      className="font-semibold text-gray-900 hover:text-brand"
                    >
                      {e.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <span className="text-gray-500">{e.type}</span>
                      {e.status === "draft" && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                          草稿
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{e.teamName}</div>
                    <div className="text-xs text-gray-500">{e.ownerName}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(e.startAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {e.registrationCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    NT$ {e.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">載入中…</p>}>
      <AdminEventsList />
    </Suspense>
  );
}
