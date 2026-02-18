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
      className="flex gap-3 sm:flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-[#5295BC]/30 hover:shadow-md transition-all duration-200"
    >
      <div className="relative h-20 w-20 sm:h-40 sm:w-full sm:aspect-video shrink-0 overflow-hidden rounded-lg bg-gray-100 -mt-0.5 sm:mt-0">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 640px) 80px, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-xs sm:text-sm">無封面</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col">
        <p className="font-medium text-gray-900 truncate text-[15px] sm:text-base">
          {event.title}
        </p>
        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
          {formatEventDateRange(event.startAt, event.endAt)}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {registrationCount} 人報名
        </p>
        <div className="mt-2 flex shrink-0 items-center gap-1.5">
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
      </div>
    </Link>
  );
}
