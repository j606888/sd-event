"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Eye, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getAdminUsers, impersonateUser, type AdminUser } from "@/lib/api/admin";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 最後登入距今天數，用來標示活躍度 */
function activityTone(lastLoginAt: string | null): string {
  if (!lastLoginAt) return "text-gray-400";
  const days = (Date.now() - new Date(lastLoginAt).getTime()) / 86_400_000;
  if (days <= 7) return "text-emerald-600 font-semibold";
  if (days <= 30) return "text-gray-700";
  return "text-gray-400";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
  });

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? users.filter(
        (u: AdminUser) =>
          u.name.toLowerCase().includes(keyword) ||
          u.email.toLowerCase().includes(keyword)
      )
    : users;

  const handleImpersonate = async (user: AdminUser) => {
    setError(null);
    setPendingId(user.id);
    try {
      await impersonateUser(user.id);
      queryClient.clear();
      router.push("/events");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法模擬此使用者");
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">使用者</h1>
        <p className="mt-1 text-sm text-gray-500">
          共 {users.length} 位使用者。可以任一使用者身分進入後台唯讀檢視。
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋姓名或 Email"
          className="pl-9"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">載入中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">沒有符合的使用者</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">使用者</th>
                <th className="px-4 py-3">團隊</th>
                <th className="px-4 py-3 text-right">活動</th>
                <th className="px-4 py-3 text-right">報名</th>
                <th className="px-4 py-3">最後登入</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: AdminUser) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {u.name}
                      {u.isSuperAdmin && (
                        <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.teams.length === 0
                      ? "—"
                      : u.teams.map((t) => t.name).join("、")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {u.eventCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {u.registrationCount}
                  </td>
                  <td className={`px-4 py-3 text-xs ${activityTone(u.lastLoginAt)}`}>
                    {formatDate(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/events?userId=${u.id}`}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <Calendar className="size-3.5" />
                        活動
                      </Link>
                      {!u.isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleImpersonate(u)}
                          disabled={pendingId === u.id}
                          className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <Eye className="size-3.5" />
                          {pendingId === u.id ? "進入中…" : "以此身分檢視"}
                        </button>
                      )}
                    </div>
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
