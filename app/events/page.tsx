"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentTeam } from "@/hooks/use-current-team";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function formatEventDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAY[d.getDay()]})`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

type EventItem = {
  id: number;
  teamId: number;
  userId: number;
  title: string;
  coverUrl: string | null;
  status: string;
  startAt: string;
  endAt: string;
  createdAt: string;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamId, loading: teamLoading } = useCurrentTeam();

  useEffect(() => {
    if (teamId == null && !teamLoading) return;
    if (teamId == null) return;
    setLoading(true);
    fetch("/api/events", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("無法載入");
        return res.json();
      })
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError("無法載入活動"))
      .finally(() => setLoading(false));
  }, [teamId, teamLoading]);

  useEffect(() => {
    if (!loading && !teamLoading && !error && teamId == null) {
      router.replace("/setup-team");
    }
  }, [loading, teamLoading, error, teamId, router]);

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">{error}</p>
        <Link href="/login" className="mt-2 inline-block text-[#5295BC] underline">
          前往登入
        </Link>
      </div>
    );
  }

  if (!teamLoading && teamId == null) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">正在導向建立團隊…</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 p-6 max-w-2xl">
      <h2 className="mb-6 text-[17px] font-semibold text-gray-900">所有活動</h2>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無活動，點擊右下角按鈕建立新活動
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
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
                    0 人報名
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
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/events/new"
        className="absolute bottom-6 right-6 flex size-16 items-center justify-center rounded-full bg-[#5295BC] text-white shadow-lg hover:opacity-90"
        aria-label="建立新活動"
      >
        <Plus className="size-10" />
      </Link>
    </div>
  );
}
