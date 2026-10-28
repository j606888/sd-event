"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type {
  PaymentAmountTotals,
  PaymentCounts,
  RoleCounts,
} from "@/lib/event-stats-summary";

export type EventStatsData = {
  roleCounts: RoleCounts;
  totalAttendees: number;
  checkedInCount: number;
  /** 已退款的筆數；這些報名不算進上面的人數與入場 */
  refundedCount?: number;
  /** 以下金額相關欄位只有管理員拿得到；驗票人員的回應裡沒有 */
  paymentAmountTotals?: PaymentAmountTotals;
  paymentCounts?: PaymentCounts;
  /** 已退款總額；不算進 paymentAmountTotals */
  refundedAmount?: number;
  purchaseItemSummary?: Array<{
    id: number;
    name: string;
    amount: number;
    attendeeCount: number;
    revenue: number;
  }>;
  /** 折扣碼折抵總額，用來把項目統計（折扣前）與款項（折扣後）對起來。 */
  discountTotal?: number;
};

/** 統計分頁與報名者頁的數字列共用同一份查詢，入場／收款後一起更新。 */
export function useEventStats(eventId: string) {
  const t = useTranslations("events.errors");
  return useQuery({
    queryKey: ["eventStats", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("loadStats"));
      return res.json() as Promise<EventStatsData>;
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
