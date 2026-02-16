"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EventForm } from "@/components/events/EventForm";
import { RegistrationsList } from "@/components/events/RegistrationsList";
import { RegistrationDetail } from "@/components/events/RegistrationDetail";
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
  { id: "replies" as const, label: "回復" },
  { id: "stats" as const, label: "統計" },
  { id: "verify" as const, label: "驗票" },
];

type Registration = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  totalAmount: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
  attendeeCount: number;
  createdAt: string;
};

type RegistrationDetailData = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentMethod: string | null;
  totalAmount: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
  paymentScreenshotUrl: string | null;
  paymentNote: string | null;
  createdAt: string;
  attendees: Array<{ id: number; name: string; role: "Leader" | "Follower" | "Not sure" | string }>;
  purchaseItem: { id: number; name: string; amount: number } | null;
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("form");
  const [shareCopied, setShareCopied] = useState(false);
  
  // Registrations state
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<number | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationDetailData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

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

  const fetchRegistrations = useCallback(async (search?: string) => {
    if (!eventId) return;
    setLoadingRegistrations(true);
    try {
      const url = `/api/events/${eventId}/registrations${search ? `?search=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch registrations:", err);
    } finally {
      setLoadingRegistrations(false);
    }
  }, [eventId]);

  const fetchRegistrationDetail = useCallback(async (registrationId: number) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/${registrationId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRegistration(data.registration);
      }
    } catch (err) {
      console.error("Failed to fetch registration detail:", err);
    }
  }, [eventId]);

  const updateRegistrationStatus = useCallback(async (registrationId: number, status: "confirmed") => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentStatus: status }),
      });
      if (res.ok) {
        // Refresh registrations and detail
        await fetchRegistrations(searchQuery);
        await fetchRegistrationDetail(registrationId);
      }
    } catch (err) {
      console.error("Failed to update registration status:", err);
    }
  }, [eventId, searchQuery, fetchRegistrations, fetchRegistrationDetail]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchEvent()
      .catch(() => setError("無法載入活動"))
      .finally(() => setLoading(false));
  }, [eventId, fetchEvent]);

  useEffect(() => {
    if (activeTab === "replies" && eventId) {
      fetchRegistrations(searchQuery);
    }
  }, [activeTab, eventId, searchQuery, fetchRegistrations]);

  useEffect(() => {
    if (selectedRegistrationId) {
      fetchRegistrationDetail(selectedRegistrationId);
    }
  }, [selectedRegistrationId, fetchRegistrationDetail]);

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
            {tab.id === "replies" && registrations.length > 0 && (
              <span className="rounded-full bg-[#5295BC] px-1.5 py-0.5 text-xs font-medium text-white">
                {registrations.length}
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
          <>
            {selectedRegistration ? (
              <RegistrationDetail
                registration={selectedRegistration}
                currentIndex={registrations.findIndex((r) => r.id === selectedRegistrationId) || 0}
                totalCount={registrations.length}
                onBack={() => {
                  setSelectedRegistration(null);
                  setSelectedRegistrationId(null);
                }}
                onPrevious={() => {
                  const currentIdx = registrations.findIndex((r) => r.id === selectedRegistrationId) || 0;
                  if (currentIdx > 0) {
                    const prevId = registrations[currentIdx - 1].id;
                    setSelectedRegistrationId(prevId);
                  }
                }}
                onNext={() => {
                  const currentIdx = registrations.findIndex((r) => r.id === selectedRegistrationId) || 0;
                  if (currentIdx < registrations.length - 1) {
                    const nextId = registrations[currentIdx + 1].id;
                    setSelectedRegistrationId(nextId);
                  }
                }}
                onStatusUpdate={async (status) => {
                  if (selectedRegistrationId) {
                    await updateRegistrationStatus(selectedRegistrationId, status);
                  }
                }}
              />
            ) : (
              <RegistrationsList
                registrations={registrations}
                onSelect={(id) => setSelectedRegistrationId(id)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            )}
            {loadingRegistrations && (
              <div className="text-center text-sm text-gray-500 py-4">載入中…</div>
            )}
          </>
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
