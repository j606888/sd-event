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
      return pathname === "/events" || (pathname.startsWith("/events/") && !pathname.startsWith("/events/locations") && !pathname.startsWith("/events/organizers") && !pathname.startsWith("/events/bank"));
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  console.log({ open })

  return (
    <>
      {/* 1. Backdrop (Mobile 專用) */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/50 transition-opacity lg:hidden"
        />
      )}

      {/* 2. Sidebar 主體 */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[70] w-[280px] bg-white border-r transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0
          flex h-full flex-col
        `}
      >
        {/* Header - 固定高度 */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-6">
          <span
            className="text-xl font-bold text-[#5295BC]"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            SD Event
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex lg:hidden size-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 捲動區域 */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 scrollbar-thin">
          {/* Team selector */}
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#5295BC]/15 text-sm font-bold text-[#5295BC]">
              {teamInitial}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
              {teamLabel}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-gray-400" />
          </div>

          <button
            type="button"
            className="mb-6 flex items-center gap-2 px-2 text-xs font-semibold text-[#5295BC] hover:opacity-80 transition-opacity"
          >
            <Plus className="size-3.5" />
            建立新團隊
          </button>

          {/* Nav List */}
          <div className="space-y-6">
            <nav className="flex flex-col gap-1">
              <SidebarLink href="/events" icon={Calendar} label="所有活動" active={isActive("/events")} onClick={onClose} />
              <SidebarLink href="/teams" icon={Users} label="團隊管理" active={isActive("/teams")} onClick={onClose} />
            </nav>

            <div>
              <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                常用資訊
              </p>
              <nav className="flex flex-col gap-1">
                <SidebarLink href="/events/locations" icon={MapPin} label="活動地點" active={isActive("/events/locations")} onClick={onClose} />
                <SidebarLink href="/events/organizers" icon={Building2} label="主辦單位" active={isActive("/events/organizers")} onClick={onClose} />
                <SidebarLink href="/events/bank" icon={Landmark} label="銀行資訊" active={isActive("/events/bank")} onClick={onClose} />
              </nav>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => { onClose(); handleLogout(); }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                <LogOut className="size-4" />
              </div>
              登出帳號
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// 抽取 Link 組件減少樣板代碼
function SidebarLink({ href, icon: Icon, label, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${active
          ? "bg-[#5295BC] text-white shadow-md shadow-blue-100"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
    >
      <Icon className={`size-5 ${active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}