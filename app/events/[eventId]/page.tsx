"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EventForm } from "@/components/events/EventForm";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

type EventData = {
  id: number;
  publicKey: string;
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

const TABS = [
  { id: "form" as const, label: "表單" },
  { id: "replies" as const, label: "回復", badge: 0 },
  { id: "stats" as const, label: "統計" },
  { id: "verify" as const, label: "驗票" },
];

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("form");
  const [shareCopied, setShareCopied] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
    if (res.status === 404) {
      setError("找不到活動");
      return null;
    }
    if (!res.ok) throw new Error("無法載入");
    const data = await res.json();
    if (data?.event) setEvent(data.event);
    return data?.event;
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchEvent()
      .catch(() => setError("無法載入活動"))
      .finally(() => setLoading(false));
  }, [eventId, fetchEvent]);

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
    <div className="flex flex-1 flex-col max-w-2xl">
      {/* Header: back + title */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link
          href="/events"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          aria-label="返回所有活動"
        >
          ←
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">
          {event.title}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-[#5295BC]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {"badge" in tab && tab.badge !== undefined && tab.badge > 0 && (
              <span className="rounded-full bg-[#5295BC] px-1.5 py-0.5 text-xs font-medium text-white">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5295BC]"
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4">
        {activeTab === "form" && (
          <EventForm
            mode="edit"
            eventId={event.id}
            teamId={event.teamId}
            initialData={event}
            submitLabel="更新表單"
            onSaveSuccess={() => fetchEvent()}
            renderExtraActions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.publicKey}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  });
                }}
              >
                <Share2 className="size-4" />
                {shareCopied ? "已複製連結" : "分享表單"}
              </Button>
            }
          />
        )}
        {activeTab === "replies" && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
            回復 — 尚未有資料
          </div>
        )}
        {activeTab === "stats" && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
            統計 — 尚未有資料
          </div>
        )}
        {activeTab === "verify" && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
            驗票 — 尚未有資料
          </div>
        )}
      </div>
    </div>
  );
}
