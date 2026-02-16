"use client";

import Image from "next/image";
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
  publicKey: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  status: string;
};

export default function PublicEventPage() {
  const params = useParams();
  const publicKey = params?.publicKey as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    fetch(`/api/events/public/${encodeURIComponent(publicKey)}`)
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
  }, [publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "找不到活動"}</p>
        <p className="text-sm text-gray-500">連結可能已失效或活動已刪除</p>
      </div>
    );
  }

  const isPublished = event.status === "published";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {event.coverUrl && (
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={event.coverUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          )}
          <div className="p-4">
            <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {formatEventDateRange(event.startAt, event.endAt)}
            </p>
            {event.description && (
              <p className="mt-4 text-gray-700 whitespace-pre-wrap text-sm">
                {event.description}
              </p>
            )}
            {!isPublished && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                此活動尚未開放報名，主辦方仍在準備中。
              </p>
            )}
            {isPublished && (
              <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                報名表單即將開放，敬請期待。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
