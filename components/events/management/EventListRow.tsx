"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getEventDateLabel } from "@/lib/format-event-date";
import { cn, isRenderableImageSrc } from "@/lib/utils";
import type { EventCardItem } from "./EventCard";
import { richText } from "@/lib/rich-text";

export type EventStatus = "draft" | "active" | "ended";

/** 活動狀態：草稿 / 進行中（已發佈未結束）/ 已結束（已過 endAt） */
export function getEventStatus(event: {
  status: string;
  endAt: string;
}): EventStatus {
  if (event.status === "draft") return "draft";
  if (new Date(event.endAt) < new Date()) return "ended";
  return "active";
}

/** 文字依狀態翻譯（events.status.*） */
const STATUS_BADGE: Record<EventStatus, { dot: string | null; className: string }> = {
  draft: { dot: "bg-butter", className: "bg-butter-soft text-butter-ink" },
  active: { dot: "bg-brand", className: "bg-brand-soft text-brand-strong" },
  ended: { dot: null, className: "bg-field text-muted-ink" },
};

// 數字與單位各自一個元素（events.units.*），被瀏覽器翻譯後數字仍會更新
const statNumber = (chunks: ReactNode) => <span>{richText(chunks)}</span>;
const statUnit = (chunks: ReactNode) => (
  <span className="text-[13px] font-medium text-muted-ink">{richText(chunks)}</span>
);

type EventListRowProps = {
  event: EventCardItem;
  /** 報名「人數」（參加者數，不是報名筆數） */
  attendeeCount?: number;
  checkedInCount?: number;
  /** 待確認收款筆數；驗票人員沒有這個數字，不給就不顯示 */
  awaitingConfirmationCount?: number;
};

function Stat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  /** 數字＋單位，來自 events.units.* 的 t.rich */
  value: ReactNode;
  tone?: string;
}) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-muted-ink">{label}</span>
      <span className={cn("font-display text-xl font-bold leading-tight tabular-nums", tone)}>
        {value}
      </span>
    </span>
  );
}

export function EventListRow({
  event,
  attendeeCount = 0,
  checkedInCount = 0,
  awaitingConfirmationCount,
}: EventListRowProps) {
  const t = useTranslations("events");
  const tPayment = useTranslations("enums.paymentStatus");
  const locale = useLocale();
  const status = getEventStatus(event);
  const badge = STATUS_BADGE[status];

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border bg-white p-3 pr-4 transition-colors hover:border-brand sm:flex-nowrap",
        status === "draft" ? "border-dashed border-gray-400" : "border-card-border"
      )}
    >
      {/* Thumbnail */}
      <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-field sm:block">
        {isRenderableImageSrc(event.coverUrl) ? (
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-soft font-display text-2xl font-bold text-brand-strong">
            {event.title?.trim().charAt(0) || "♪"}
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="truncate text-[17px] font-bold text-ink">{event.title}</span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
              badge.className
            )}
          >
            {badge.dot && <span className={cn("size-1.5 rounded-full", badge.dot)} aria-hidden />}
            <span>{t(`status.${status}`)}</span>
          </span>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-ink">
          {[getEventDateLabel(event.startAt, event.endAt, locale), event.location?.name]
            .filter(Boolean)
            .join(" ・ ")}
        </p>
      </div>

      {/* 數字：一眼看出哪一場有事要處理 */}
      {status !== "draft" && (
        <div className="flex shrink-0 gap-6 sm:gap-7">
          <Stat
            label={t("listRow.registered")}
            value={t.rich("units.people", { count: attendeeCount, num: statNumber, unit: statUnit })}
          />
          {awaitingConfirmationCount !== undefined && (
            <Stat
              label={tPayment("reported")}
              value={t.rich("units.registrations", {
                count: awaitingConfirmationCount,
                num: statNumber,
                unit: statUnit,
              })}
              tone={awaitingConfirmationCount > 0 ? "text-butter-ink" : "text-muted-ink"}
            />
          )}
          <Stat
            label={t("listRow.checkedIn")}
            value={t.rich("units.ofTotal", {
              count: checkedInCount,
              total: attendeeCount,
              num: statNumber,
              unit: statUnit,
            })}
          />
        </div>
      )}
      <ChevronRight className="hidden size-[18px] shrink-0 text-gray-400 sm:block" />
    </Link>
  );
}
