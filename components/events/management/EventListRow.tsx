"use client";

import Image from "next/image";
import Link from "next/link";
import { getEventDateLabel } from "@/lib/format-event-date";
import { isRenderableImageSrc } from "@/lib/utils";
import type { EventCardItem } from "./EventCard";

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

const STATUS_BADGE: Record<EventStatus, { text: string; className: string }> = {
  draft: { text: "草稿", className: "bg-orange-100 text-orange-700" },
  active: { text: "銷售中", className: "bg-green-100 text-green-700" },
  ended: { text: "已結束", className: "bg-gray-100 text-gray-600" },
};

type EventListRowProps = {
  event: EventCardItem;
  registrationCount?: number;
};

export function EventListRow({ event, registrationCount = 0 }: EventListRowProps) {
  const badge = STATUS_BADGE[getEventStatus(event)];

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-[#5295BC]/40 hover:bg-[#5295BC]/[0.03] sm:gap-4 sm:px-4"
    >
      {/* Thumbnail */}
      <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:block">
        {isRenderableImageSrc(event.coverUrl) ? (
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            無封面
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{event.title}</p>
        <p className="mt-0.5 truncate text-sm text-gray-500">
          {getEventDateLabel(event.startAt, event.endAt)}
          {event.location?.name ? ` ・ ${event.location.name}` : ""}
        </p>
      </div>

      {/* Status + registration count */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.text}
        </span>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{registrationCount}</span> 人報名
        </span>
      </div>
    </Link>
  );
}
