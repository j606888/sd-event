"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * 順序即顯示順序：開賣後每天在用的（報名者、統計）在前，設定類在後。
 * QR 驗票不再是分頁 —— 門口多半報名字或電話找人，掃描器改成報名者頁的次要按鈕。
 * 分頁名稱在元件裡依 id 翻譯（events.tabs.<id>）。
 */
export const EVENT_TABS = [
  { id: "registrations" },
  { id: "stats" },
  { id: "tickets" },
  { id: "basic" },
] as const;

export type EventTabId = (typeof EVENT_TABS)[number]["id"];

const TAB_IDS: readonly string[] = EVENT_TABS.map((t) => t.id);

/** 編輯活動時屬於表單（useEventForm）範圍的分頁 */
export const FORM_TAB_IDS: readonly EventTabId[] = ["basic", "tickets"];

/** 設定類分頁：在分頁列上與日常分頁分開一組 */
export const SETTINGS_TAB_IDS: readonly EventTabId[] = ["tickets", "basic"];

/** 驗票人員只需要報名者名單（找人、入場、掃 QR 都在這頁），其餘分頁不開放。 */
export const STAFF_TAB_IDS: readonly EventTabId[] = ["registrations"];

/**
 * 活動詳情頁分頁狀態，同步至網址 `?tab=`：可深連結、重新整理不跳走。
 * 不在 `allowedTabs` 內（或缺少）的 tab 值一律回到 `defaultTab`（沒給或不可用時是
 * 第一個可用分頁）—— 驗票人員直接手打 `?tab=stats` 也會被導回，看不到統計；
 * 舊書籤的 `?tab=verify` 同樣落回預設。
 */
export function useTabParam(
  allowedTabs: readonly EventTabId[] = EVENT_TABS.map((t) => t.id),
  defaultTab?: EventTabId
): [EventTabId, (tab: EventTabId) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get("tab");
  const allowed: readonly string[] = allowedTabs.length > 0 ? allowedTabs : TAB_IDS;
  const tab: EventTabId = allowed.includes(raw ?? "")
    ? (raw as EventTabId)
    : defaultTab && allowed.includes(defaultTab)
      ? defaultTab
      : (allowed[0] as EventTabId);

  const setTab = useCallback(
    (next: EventTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      // replace：切分頁不堆瀏覽紀錄，「上一頁」直接回活動列表
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return [tab, setTab];
}
