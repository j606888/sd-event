"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventCard } from "@/components/events/EventCard";
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
    <div className="relative flex-1 p-4 max-w-2xl">
      <h2 className="mb-6 text-[17px] font-semibold text-gray-900">所有活動</h2>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無活動，點擊右下角按鈕建立新活動
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
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
