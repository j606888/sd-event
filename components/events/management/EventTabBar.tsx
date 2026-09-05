"use client";

import {
  Info,
  Ticket,
  Users,
  ChartColumn,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { EVENT_TABS, type EventTabId } from "@/hooks/use-tab-param";
import { cn } from "@/lib/utils";

const TAB_META: Record<EventTabId, { icon: LucideIcon; shortLabel: string }> = {
  basic: { icon: Info, shortLabel: "基本" },
  tickets: { icon: Ticket, shortLabel: "票券" },
  registrations: { icon: Users, shortLabel: "報名" },
  stats: { icon: ChartColumn, shortLabel: "統計" },
  verify: { icon: ScanLine, shortLabel: "驗票" },
};

type EventTabBarProps = {
  activeTab: EventTabId;
  onSelect: (tab: EventTabId) => void;
  registrationCount: number;
  /** 可見分頁；預設全部。驗票人員只拿到 STAFF_TAB_IDS */
  tabIds?: readonly EventTabId[];
};

/**
 * 活動管理頁分頁導覽：
 * - sm 以上：上方水平分頁（active = 品牌色 + 底線）
 * - 手機：固定底部導覽列，icon + 短標籤，免橫向捲動
 */
export function EventTabBar({ activeTab, onSelect, registrationCount, tabIds }: EventTabBarProps) {
  const tabs = tabIds
    ? tabIds
        .map((id) => EVENT_TABS.find((t) => t.id === id))
        .filter((t): t is (typeof EVENT_TABS)[number] => Boolean(t))
    : EVENT_TABS;

  return (
    <>
      {/* 桌機/平板：上方分頁，靠左排列 */}
      <div className="hidden border-b border-hairline sm:flex">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                active ? "text-brand" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
              {tab.id === "registrations" && registrationCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                    active ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {registrationCount}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* 手機：固定底部導覽列 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="活動管理分頁"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const { icon: Icon, shortLabel } = TAB_META[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors cursor-pointer",
                active ? "text-brand" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {tab.id === "registrations" && registrationCount > 0 && (
                  <span className="absolute -right-2.5 -top-1 rounded-full bg-follower px-1 py-px text-[9px] font-bold leading-tight text-white tabular-nums">
                    {registrationCount > 99 ? "99+" : registrationCount}
                  </span>
                )}
              </span>
              <span className={cn("text-[10px] leading-tight", active && "font-semibold")}>
                {shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
