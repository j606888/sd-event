"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EventListRow,
  getEventStatus,
  type EventStatus,
} from "@/components/events/management/EventListRow";
import { useCurrentTeam } from "@/hooks/use-current-team";
import type { EventLocation } from "@/types/event";

type EventItem = {
  id: number;
  teamId: number;
  userId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  status: string;
  startAt: string;
  endAt: string;
  location: EventLocation | null;
  createdAt: string;
  registrationCount?: number;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamId, isLoading: teamLoading } = useCurrentTeam();

  useEffect(() => {
    if (teamId == null && !teamLoading) return;
    if (teamId == null) return;
    setLoading(true);
    setError(null);
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
        <Link href="/login" className="mt-2 inline-block text-brand underline">
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

  const GROUP_ORDER: { status: EventStatus; title: string }[] = [
    { status: "active", title: "進行中" },
    { status: "draft", title: "草稿" },
    { status: "ended", title: "已結束" },
  ];

  const groups = GROUP_ORDER.map(({ status, title }) => {
    const items = events
      .filter((e) => getEventStatus(e) === status)
      .sort((a, b) => {
        const aT = new Date(a.startAt).getTime();
        const bT = new Date(b.startAt).getTime();
        // 進行中／草稿：由近到遠；已結束：由新到舊
        return status === "ended" ? bT - aT : aT - bT;
      });
    return { status, title, items };
  }).filter((g) => g.items.length > 0);

  return (
    <div className="w-full max-w-5xl flex-1 px-4 py-5 md:px-8 md:py-8">
      {/* Header with title and create button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">
          所有活動
        </h1>
        <Link
          href="/events/new"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 shadow-sm"
          aria-label="建立新活動"
        >
          <Plus className="size-4" />
          <span>建立活動</span>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 md:py-20 text-center text-gray-500">
          尚無活動，點擊「建立活動」開始
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="mb-1 flex items-baseline gap-2 border-b border-hairline pb-2 text-xs font-bold tracking-[0.15em] text-gray-400">
                {group.title}
                <span className="font-display text-gray-300">{group.items.length}</span>
              </h2>
              <ul className="divide-y divide-hairline">
                {group.items.map((event) => (
                  <li key={event.id}>
                    <EventListRow
                      event={event}
                      registrationCount={event.registrationCount ?? 0}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Mobile FAB: only show when there are events */}
      {events.length > 0 && (
        <Link
          href="/events/new"
          className="fixed bottom-6 right-6 flex md:hidden size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:opacity-90 z-10"
          aria-label="建立新活動"
        >
          <Plus className="size-8" />
        </Link>
      )}
    </div>
  );
}
