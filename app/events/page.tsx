"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventCard } from "@/components/events/management/EventCard";
import { useCurrentTeam } from "@/hooks/use-current-team";

type EventLocation = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

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
    <div className="flex-1 p-4 md:p-6">
      {/* Header with title and create button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          所有活動
        </h1>
        <Link
          href="/events/new"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#5295BC] text-white text-sm font-medium hover:opacity-90 shadow-sm"
          aria-label="建立新活動"
        >
          <Plus className="size-4" />
          <span>建立活動</span>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 md:py-20 text-center text-gray-500">
          尚無活動，點擊「建立活動」開始
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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

      {/* Mobile FAB: only show when there are events */}
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
