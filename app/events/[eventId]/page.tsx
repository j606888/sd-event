"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function formatEventDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAY[d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

type EventData = {
  id: number;
  teamId: number;
  userId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  locationId: number | null;
  organizerId: number | null;
  bankInfoId: number | null;
  allowMultiplePurchase: boolean;
  status: string;
  createdAt: string;
  updatedAt: string | null;
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetch(`/api/events/${eventId}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 404) {
          setError("找不到活動");
          return null;
        }
        if (!res.ok) throw new Error("無法載入");
        return res.json();
      })
      .then((data) => (data?.event ? setEvent(data.event) : null))
      .catch(() => setError("無法載入活動"))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">{error ?? "找不到活動"}</p>
        <Link href="/events" className="mt-2 inline-block text-[#5295BC] underline">
          返回活動列表
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-2xl">
      <Link href="/events" className="mb-4 inline-block text-sm text-[#5295BC] hover:underline">
        ← 返回所有活動
      </Link>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {event.coverUrl && (
          <div className="relative h-48 w-full bg-gray-100">
            <Image
              src={event.coverUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        )}
        <div className="p-4">
          <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {formatEventDateRange(event.startAt, event.endAt)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {event.status === "published" ? "進行中" : "草稿"}
          </p>
          {event.description && (
            <p className="mt-4 text-gray-700 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
