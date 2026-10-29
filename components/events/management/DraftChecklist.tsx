"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { money } from "@/components/events/management/tickets/wizard/plan-view";
import { PUBLISH_STEPS } from "@/lib/create-event";
import { cn } from "@/lib/utils";
import type { EventData } from "@/hooks/use-event-detail";
import type { EventTabId } from "@/hooks/use-tab-param";
import { bankInfoTitle, useSavedBankInfos, useSavedLocations } from "@/hooks/use-saved-info";

type TicketRow = {
  hidden?: boolean;
  amount: number;
  prices?: { amount: number; available?: boolean }[];
};

/**
 * 草稿活動發布前還缺什麼（地點、收款帳戶、票券）。
 * 活動頁的「發布」按鈕與待辦清單共用；票券還沒載入前 missing 為 null（不擋發布，伺服器會再檢查）。
 */
export function useDraftReadiness(event: EventData | undefined, enabled: boolean) {
  const on = enabled && event != null && event.status === "draft";
  const tickets = useQuery({
    queryKey: ["eventPurchaseItems", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/purchase-items`, { credentials: "include" });
      if (!res.ok) throw new Error("purchase-items");
      const data = await res.json();
      return (data.purchaseItems ?? []) as TicketRow[];
    },
    enabled: on,
  });
  const locations = useSavedLocations(event?.teamId, on && event?.locationId != null);
  const bankInfos = useSavedBankInfos(event?.teamId, on && event?.bankInfoId != null);

  const onSale = (tickets.data ?? []).filter((i) => !i.hidden);
  const prices = onSale.flatMap((i) => {
    const available = (i.prices ?? []).filter((p) => p.available !== false).map((p) => p.amount);
    return available.length > 0 ? available : [i.amount];
  });
  const done = {
    location: event?.locationId != null,
    payment: event?.bankInfoId != null,
    tickets: onSale.length > 0,
  };
  return {
    done,
    missing: tickets.isSuccess ? PUBLISH_STEPS.filter((k) => !done[k]) : null,
    locationName: locations.data?.find((l) => l.id === event?.locationId)?.name ?? "",
    bank: bankInfos.data?.find((b) => b.id === event?.bankInfoId),
    ticketCount: onSale.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
  };
}

export type DraftReadiness = ReturnType<typeof useDraftReadiness>;

/**
 * 存成草稿後，活動頁上的待辦：建立時跳過的步驟在這裡補，補完就能發布。
 * 選填的封面也列在最後，但不算進進度。
 */
export function DraftChecklist({
  event,
  readiness,
  onGoTab,
}: {
  event: EventData;
  readiness: DraftReadiness;
  onGoTab: (tab: EventTabId) => void;
}) {
  const t = useTranslations("events.draftChecklist");
  const tAnswers = useTranslations("createEvent.answers");
  const { done, missing } = readiness;
  if (missing == null) return null;

  const total = PUBLISH_STEPS.length;
  const doneCount = total - missing.length;
  const rows: {
    key: (typeof PUBLISH_STEPS)[number];
    value: string;
    tab: EventTabId;
  }[] = [
    { key: "location", value: readiness.locationName, tab: "basic" },
    { key: "payment", value: readiness.bank ? bankInfoTitle(readiness.bank) : "", tab: "basic" },
    {
      key: "tickets",
      value: tAnswers("tickets", { count: readiness.ticketCount, price: money(readiness.minPrice) }),
      tab: "tickets",
    },
  ];
  // 還沒做的排前面
  rows.sort((a, b) => Number(done[a.key]) - Number(done[b.key]));

  return (
    <section aria-labelledby="draft-checklist-title" className="surface-card overflow-hidden">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4",
          missing.length > 0 ? "bg-butter-soft" : "bg-brand-soft"
        )}
      >
        <div className="min-w-0 flex-1 basis-72">
          <h2 id="draft-checklist-title" className="font-display text-lg font-bold text-ink">
            {missing.length > 0 ? t("missingTitle", { count: missing.length }) : t("readyTitle")}
          </h2>
          <p className={cn("mt-0.5 text-sm", missing.length > 0 ? "text-butter-ink" : "text-gray-700")}>
            {missing.length > 0 ? t("missingDescription") : t("readyDescription")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-60">
          <div className="flex justify-between text-[13px] font-semibold text-ink">
            <span>{t("progress")}</span>
            <span className="tabular-nums">{t("progressValue", { done: doneCount, total })}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("progress")}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneCount}
            className="h-2 overflow-hidden rounded-full bg-white"
          >
            <div
              className={cn("h-2", missing.length > 0 ? "bg-butter" : "bg-brand")}
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-hairline">
        {rows.map((row) => {
          const isDone = done[row.key];
          return (
            <li key={row.key} className="flex items-center gap-3 px-5 py-3">
              {isDone ? (
                <span aria-hidden className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-brand">
                  <Check className="size-3.5 text-ink" strokeWidth={3} />
                </span>
              ) : (
                <span aria-hidden className="size-[26px] shrink-0 rounded-full border-2 border-dashed border-butter-ink" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-ink", isDone ? "font-semibold" : "font-bold")}>{t(`${row.key}.label`)}</p>
                <p className="truncate text-[13px] text-muted-ink">{isDone ? row.value : t(`${row.key}.missing`)}</p>
              </div>
              {!isDone && (
                <Button
                  type="button"
                  onClick={() => onGoTab(row.tab)}
                  className="h-11 shrink-0 bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
                >
                  {t(`${row.key}.action`)}
                </Button>
              )}
            </li>
          );
        })}
        {!event.coverUrl && (
          <li className="flex items-center gap-3 bg-paper/60 px-5 py-3">
            <span aria-hidden className="size-[26px] shrink-0 rounded-full border-2 border-dashed border-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                <span>{t("cover.label")}</span>
                <span className="ml-1.5 text-xs font-medium text-muted-ink">{t("optional")}</span>
              </p>
              <p className="text-[13px] text-muted-ink">{t("cover.missing")}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onGoTab("basic")}
              className="h-11 shrink-0 px-3.5 text-sm font-semibold text-brand-strong"
            >
              {t("cover.action")}
            </Button>
          </li>
        )}
      </ul>
    </section>
  );
}
