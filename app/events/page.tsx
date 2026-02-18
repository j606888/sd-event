"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventCard } from "@/components/events/management/EventCard";
import { useCurrentTeam } from "@/hooks/use-current-team";

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
  registrationCount?: number;
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
    <div className="relative flex-1 p-4 md:p-6 max-w-2xl md:max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-[17px] md:text-xl font-semibold text-gray-900">
          所有活動
        </h2>
        <Link
          href="/events/new"
          className="order-first sm:order-0 flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex px-4 py-2.5 rounded-lg bg-[#5295BC] text-white text-sm font-medium hover:opacity-90 shadow-sm md:shadow"
          aria-label="建立新活動"
        >
          <Plus className="size-5" />
          <span>建立新活動</span>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 md:py-20 text-center text-gray-500">
          尚無活動，點擊「建立新活動」開始
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                registrationCount={event.registrationCount ?? 0}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Mobile FAB: only show when there are events (desktop uses header button) */}
      {events.length > 0 && (
        <Link
          href="/events/new"
          className="fixed bottom-6 right-6 flex md:hidden size-14 items-center justify-center rounded-full bg-[#5295BC] text-white shadow-lg hover:opacity-90 z-10"
          aria-label="建立新活動"
        >
          <Plus className="size-8" />
        </Link>
      )}
    </div>
  );
}
