"use client";

import Image from "next/image";
import Link from "next/link";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function formatEventDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAY[d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export type EventCardItem = {
  id: number;
  title: string;
  coverUrl: string | null;
  status: string;
  startAt: string;
  endAt: string;
};

type EventCardProps = {
  event: EventCardItem;
  registrationCount?: number;
};

export function EventCard({ event, registrationCount = 0 }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex gap-4 rounded-lg bg-white items-start"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-xs">無封面</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{event.title}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {formatEventDateRange(event.startAt, event.endAt)}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {registrationCount} 人報名
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            event.status === "published" ? "text-[#5295BC]" : "text-gray-500"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              event.status === "published" ? "bg-[#5295BC]" : "bg-gray-400"
            }`}
          />
          {event.status === "published" ? "進行中" : "草稿"}
        </span>
      </div>
    </Link>
  );
}
