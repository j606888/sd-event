"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const EVENT_TABS = [
  { id: "basic", label: "基本資訊" },
  { id: "tickets", label: "票券設定" },
  { id: "payment", label: "主辦與收款" },
  { id: "registrations", label: "報名者" },
  { id: "stats", label: "統計" },
  { id: "verify", label: "驗票" },
] as const;

export type EventTabId = (typeof EVENT_TABS)[number]["id"];

const TAB_IDS: readonly string[] = EVENT_TABS.map((t) => t.id);

/** 編輯活動時屬於表單（useEventForm）範圍的分頁 */
export const FORM_TAB_IDS: readonly EventTabId[] = ["basic", "tickets", "payment"];

/**
 * 活動詳情頁分頁狀態，同步至網址 `?tab=`：可深連結、重新整理不跳走。
 * 非法或缺少的 tab 值一律回到「基本資訊」。
 */
export function useTabParam(): [EventTabId, (tab: EventTabId) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get("tab");
  const tab: EventTabId = TAB_IDS.includes(raw ?? "")
    ? (raw as EventTabId)
    : "basic";

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
