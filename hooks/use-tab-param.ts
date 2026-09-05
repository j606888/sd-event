"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const EVENT_TABS = [
  { id: "basic", label: "基本資訊" },
  { id: "tickets", label: "票券設定" },
  { id: "registrations", label: "報名者" },
  { id: "stats", label: "統計" },
  { id: "verify", label: "驗票" },
] as const;

export type EventTabId = (typeof EVENT_TABS)[number]["id"];

const TAB_IDS: readonly string[] = EVENT_TABS.map((t) => t.id);

/** 編輯活動時屬於表單（useEventForm）範圍的分頁 */
export const FORM_TAB_IDS: readonly EventTabId[] = ["basic", "tickets"];

/**
 * 驗票人員只需要驗票與報名者名單，其餘分頁不開放。
 * 驗票排在前面：它是第一個可用分頁，所以也是預設落點。
 */
export const STAFF_TAB_IDS: readonly EventTabId[] = ["verify", "registrations"];

/**
 * 活動詳情頁分頁狀態，同步至網址 `?tab=`：可深連結、重新整理不跳走。
 * 不在 `allowedTabs` 內（或缺少）的 tab 值一律回到第一個可用分頁 ——
 * 驗票人員直接手打 `?tab=stats` 也會被導回，看不到統計。
 */
export function useTabParam(
  allowedTabs: readonly EventTabId[] = EVENT_TABS.map((t) => t.id)
): [EventTabId, (tab: EventTabId) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get("tab");
  const allowed: readonly string[] = allowedTabs.length > 0 ? allowedTabs : TAB_IDS;
  const tab: EventTabId = allowed.includes(raw ?? "")
    ? (raw as EventTabId)
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
