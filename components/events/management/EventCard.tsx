"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";

export type EventLocation = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

export type EventCardItem = {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  status: string;
  startAt: string;
  endAt: string;
  location: EventLocation | null;
};

type EventCardProps = {
  event: EventCardItem;
  registrationCount?: number;
};

export function EventCard({ event, registrationCount = 0 }: EventCardProps) {
  const getStatusBadge = () => {
    const now = new Date();
    const endDate = new Date(event.endAt);
    const isEnded = endDate < now;

    if (event.status === "draft") {
      return { text: "草稿", className: "bg-orange-100 text-orange-700" };
    }
    if (isEnded) {
      return { text: "已結束", className: "bg-gray-100 text-gray-700" };
    }
    return { text: "銷售中", className: "bg-green-100 text-green-700" };
  };

  const statusBadge = getStatusBadge();

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm hover:border-[#5295BC]/30 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Image with status badge */}
      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-sm">無封面</span>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
          >
            {statusBadge.text}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Date & Time */}
        <div className="flex items-start gap-2 mb-2">
          <Clock className="size-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {getEventDateLabel(event.startAt, event.endAt)}
            </p>
            <p className="text-sm text-gray-500">
              {getEventTimeRange(event.startAt, event.endAt)}
            </p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="size-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 line-clamp-1">
                {event.location.name}
              </p>
              {event.location.address && (
                <p className="text-sm text-gray-500 line-clamp-1">
                  {event.location.address}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer with registration count and action button */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {registrationCount} 人報名
          </span>
          <span className="text-sm font-medium text-[#5295BC]">
            管理
          </span>
        </div>
      </div>
    </Link>
  );
}
