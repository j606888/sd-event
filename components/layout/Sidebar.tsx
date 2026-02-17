"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  ChevronsUpDown,
  Plus,
  Calendar,
  Users,
  MapPin,
  Building2,
  Landmark,
  LogOut,
} from "lucide-react";

type Team = { id: number; name: string } | null;

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  team: Team;
};

export function Sidebar({ open, onClose, team }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const teamLabel = team?.name ?? "選擇團隊";
  const teamInitial = team?.name?.charAt(0)?.toUpperCase() ?? "?";

  const isActive = (href: string) => {
    if (href === "/events") {
      // Active for /events and /events/[eventId], but not /events/locations, /events/organizers, /events/bank
      return pathname === "/events" || (pathname.startsWith("/events/") && !pathname.startsWith("/events/locations") && !pathname.startsWith("/events/organizers") && !pathname.startsWith("/events/bank"));
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Backdrop：僅在 open 時顯示並可點擊 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="關閉選單"
        aria-hidden={!open}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity md:hidden ${
          open
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
        style={open ? undefined : { visibility: "hidden" }}
      />

      {/* Drawer：關閉時移出視窗並不可點擊 */}
      <aside
        aria-hidden={!open}
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-200 ease-out ${
          open
            ? "translate-x-0 visible pointer-events-auto"
            : "-translate-x-full invisible pointer-events-none"
        }`}
        style={
          open
            ? undefined
            : { transform: "translateX(-100%)", visibility: "hidden" }
        }
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
          <span
            className="font-bold text-[#5295BC]"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            SD Event
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center text-gray-500 hover:text-gray-900"
            aria-label="關閉選單"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {/* Team selector */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5295BC]/15 text-sm font-semibold text-[#5295BC]">
              {teamInitial}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
              {teamLabel}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-gray-400" />
          </div>
          <button
            type="button"
            className="mb-6 flex items-center gap-2 text-sm text-[#5295BC] hover:underline"
          >
            <Plus className="size-4" />
            建立新團隊
          </button>

          {/* Main nav */}
          <nav className="flex flex-col gap-0.5">
            <Link
              href="/events"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isActive("/events")
                  ? "bg-[#5295BC]/10 text-[#5295BC]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Calendar className="size-5" />
              <span className="font-medium">所有活動</span>
            </Link>
            <Link
              href="/teams"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isActive("/teams")
                  ? "bg-[#5295BC]/10 text-[#5295BC]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Users className="size-5" />
              <span className="font-medium">團隊管理</span>
            </Link>
          </nav>

          {/* 常用資訊 */}
          <p className="mb-2 mt-8 text-xs font-medium uppercase tracking-wider text-gray-400">
            常用資訊
          </p>
          <nav className="flex flex-col gap-0.5">
            <Link
              href="/events/locations"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isActive("/events/locations")
                  ? "bg-[#5295BC]/10 text-[#5295BC]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MapPin className="size-5" />
              <span className="font-medium">活動地點</span>
            </Link>
            <Link
              href="/events/organizers"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isActive("/events/organizers")
                  ? "bg-[#5295BC]/10 text-[#5295BC]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Building2 className="size-5" />
              <span className="font-medium">主辦單位</span>
            </Link>
            <Link
              href="/events/bank"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isActive("/events/bank")
                  ? "bg-[#5295BC]/10 text-[#5295BC]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Landmark className="size-5" />
              <span className="font-medium">銀行資訊</span>
            </Link>
          </nav>

          {/* Logout */}
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => {
                onClose();
                handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50"
            >
              <div className="flex size-8 items-center justify-center rounded bg-red-100">
                <LogOut className="size-4" />
              </div>
              <span className="font-medium">登出</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
