"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  EventListRow,
  getEventStatus,
  type EventStatus,
} from "@/components/events/management/EventListRow";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { useReadOnly } from "@/hooks/use-session";
import { useTeamRole } from "@/hooks/use-team-role";
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
  attendeeCount?: number;
  checkedInCount?: number;
  /** 管理員才有 */
  awaitingConfirmationCount?: number;
};

export default function EventsPage() {
  const router = useRouter();
  const t = useTranslations("events.list");
  const tCommon = useTranslations("common");
  const tEvents = useTranslations("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 只記「載入失敗」這件事，訊息在畫面上依語系翻譯
  const [error, setError] = useState(false);
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const readOnly = useReadOnly();
  // 驗票人員不能建立活動
  const { isAdmin } = useTeamRole();

  useEffect(() => {
    // 團隊還在載入 → 維持載入中；載完了但沒有團隊（或載失敗）→ 結束載入，
    // 交給下面的錯誤／導向分支處理。這裡一定要把 loading 收掉，否則整頁會永遠
    // 停在「載入中…」，連錯誤畫面跟導向都跑不到。
    if (teamLoading) return;
    if (teamId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch("/api/events", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
        return res.json();
      })
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [teamId, teamLoading]);

  useEffect(() => {
    if (!loading && !teamLoading && !error && !teamError && teamId == null) {
      router.replace("/setup-team");
    }
  }, [loading, teamLoading, error, teamError, teamId, router]);

  if ((loading || teamLoading) && events.length === 0 && !teamError) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (error || teamError) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">{error ? t("loadFailed") : teamError}</p>
        <Link
          href="/login?next=%2Fevents"
          className="mt-2 inline-block text-brand-strong underline"
        >
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  if (!teamLoading && teamId == null) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">{t("redirectingToSetup")}</p>
      </div>
    );
  }

  const GROUP_ORDER: { status: EventStatus; title: string }[] = [
    { status: "active", title: tEvents("status.active") },
    { status: "draft", title: tEvents("status.draft") },
    { status: "ended", title: tEvents("status.ended") },
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
          {t("title")}
        </h1>
        {!isAdmin ? null : readOnly ? (
          <span
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-400"
            title={tEvents("readOnly")}
          >
            <Plus className="size-4" />
            <span>{t("create")}</span>
          </span>
        ) : (
          <Link
            href="/events/new"
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-ink transition-colors hover:bg-brand-hover"
            aria-label={t("createAria")}
          >
            <Plus className="size-4" />
            <span>{t("create")}</span>
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 md:py-20 text-center text-gray-500">
          {isAdmin ? t("emptyAdmin") : t("emptyStaff")}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="flex items-baseline gap-2 text-xs font-bold tracking-[0.15em] text-muted-ink">
                <span>{group.title}</span>
                <span className="font-display text-gray-400">{group.items.length}</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {group.items.map((event) => (
                  <li key={event.id}>
                    <EventListRow
                      event={event}
                      attendeeCount={event.attendeeCount ?? 0}
                      checkedInCount={event.checkedInCount ?? 0}
                      awaitingConfirmationCount={event.awaitingConfirmationCount}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Mobile FAB: only show when there are events */}
      {events.length > 0 && isAdmin && (
        <Link
          href="/events/new"
          className="fixed bottom-6 right-6 flex md:hidden size-14 items-center justify-center rounded-full bg-brand text-ink shadow-lg hover:opacity-90 z-10"
          aria-label={t("createAria")}
        >
          <Plus className="size-8" />
        </Link>
      )}
    </div>
  );
}
