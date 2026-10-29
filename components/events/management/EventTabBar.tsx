"use client";

import {
  Search,
  ChartColumn,
  UserPlus,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EVENT_TABS, SETTINGS_TAB_IDS, type EventTabId } from "@/hooks/use-tab-param";
import { cn } from "@/lib/utils";

type EventTabBarProps = {
  activeTab: EventTabId;
  onSelect: (tab: EventTabId) => void;
  registrationCount: number;
  /** 可見分頁；預設全部。驗票人員只拿到 STAFF_TAB_IDS */
  tabIds?: readonly EventTabId[];
  /** 手機底部導覽列的「現場報名」；不給就不顯示 */
  onWalkIn?: () => void;
};

const isSettingsTab = (id: EventTabId) => (SETTINGS_TAB_IDS as readonly string[]).includes(id);

/**
 * 活動管理頁分頁導覽：
 * - sm 以上：上方水平分頁，日常分頁靠左、設定分頁靠右自成一組
 * - 手機：固定底部導覽列（報名者／統計／現場報名／活動設定），設定內再用小分頁切換
 */
export function EventTabBar({
  activeTab,
  onSelect,
  registrationCount,
  tabIds,
  onWalkIn,
}: EventTabBarProps) {
  const t = useTranslations("events");
  const tabs = EVENT_TABS.filter((tab) => !tabIds || tabIds.includes(tab.id));
  const dailyTabs = tabs.filter((tab) => !isSettingsTab(tab.id));
  const settingsTabs = tabs.filter((tab) => isSettingsTab(tab.id));
  const inSettings = isSettingsTab(activeTab);

  const desktopTab = (tab: (typeof EVENT_TABS)[number], quiet = false) => {
    const active = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onSelect(tab.id)}
        className={cn(
          "relative flex h-11 items-center gap-2 px-3.5 text-sm transition-colors cursor-pointer",
          active
            ? "font-bold text-ink"
            : cn("text-muted-ink hover:text-ink", quiet ? "font-normal" : "font-medium")
        )}
      >
        <span>{t(`tabs.${tab.id}`)}</span>
        {tab.id === "registrations" && registrationCount > 0 && (
          <span
            className={cn(
              "rounded-full px-2 py-px font-display text-xs font-semibold tabular-nums",
              active ? "bg-brand-soft text-brand-strong" : "bg-field text-muted-ink"
            )}
          >
            {registrationCount}
          </span>
        )}
        {active && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" aria-hidden />
        )}
      </button>
    );
  };

  const mobileItem = ({
    key,
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    key: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer",
        active ? "text-ink" : "text-muted-ink"
      )}
    >
      <Icon
        className={cn("size-[22px]", active && "text-brand-strong")}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span className={cn("text-[11px] leading-tight", active && "font-bold")}>{label}</span>
    </button>
  );

  return (
    <>
      {/* 桌機/平板：上方分頁 */}
      <div className="hidden items-center border-b border-hairline sm:flex">
        {dailyTabs.map((tab) => desktopTab(tab))}
        {settingsTabs.length > 0 && (
          <>
            <span className="flex-1" />
            <span className="px-1.5 text-xs text-gray-400">{t("tabBar.settings")}</span>
            {settingsTabs.map((tab) => desktopTab(tab, true))}
          </>
        )}
      </div>

      {/* 手機：設定類的兩個分頁收在同一個底部項目裡，進去後用這排切換 */}
      {inSettings && settingsTabs.length > 1 && (
        <div className="flex gap-1 rounded-xl bg-field p-1 sm:hidden">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "h-9 flex-1 rounded-lg text-sm transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "bg-white font-bold text-ink shadow-xs"
                  : "font-medium text-muted-ink"
              )}
            >
              {t(`tabs.${tab.id}`)}
            </button>
          ))}
        </div>
      )}

      {/* 手機：固定底部導覽列 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-white/95 px-2 pt-1 backdrop-blur pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden"
        aria-label={t("tabBar.navLabel")}
      >
        {dailyTabs.map((tab) =>
          mobileItem({
            key: tab.id,
            icon: tab.id === "registrations" ? Search : ChartColumn,
            label: t(`tabs.${tab.id}`),
            active: activeTab === tab.id,
            onClick: () => onSelect(tab.id),
          })
        )}
        {onWalkIn &&
          mobileItem({
            key: "walk-in",
            icon: UserPlus,
            label: t("tabBar.walkIn"),
            active: false,
            onClick: onWalkIn,
          })}
        {settingsTabs.length > 0 &&
          mobileItem({
            key: "settings",
            icon: SlidersHorizontal,
            label: t("tabBar.settings"),
            active: inSettings,
            onClick: () => onSelect(inSettings ? activeTab : settingsTabs[0].id),
          })}
      </nav>
    </>
  );
}
