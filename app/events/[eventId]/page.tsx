"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EventForm } from "@/components/events/management/EventForm";
import { EventStats } from "@/components/events/management/EventStats";
import { WalkInDrawer } from "@/components/events/management/WalkInDrawer";
import { RegistrationEditDrawer } from "@/components/events/management/RegistrationEditDrawer";
import { RegistrationsList } from "@/components/events/registration/RegistrationsList";
import { RegistrationDetail, RegistrationDetailSkeleton } from "@/components/events/registration/RegistrationDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, UserPlus, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/use-event-detail";
import {
  useRegistrations,
  useRegistrationDetail,
  useUpdateRegistration,
  useCheckIn,
} from "@/hooks/use-registrations";
import type { PaymentFilter, CheckInFilter, HiddenFilter } from "@/lib/registration-list-filters";

const TABS = [
  { id: "form" as const, label: "表單" },
  { id: "replies" as const, label: "報名者" },
  { id: "stats" as const, label: "統計" },
  { id: "verify" as const, label: "驗票" },
];

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const queryClient = useQueryClient();

  // UI state
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("form");
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<number | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("all");
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("non_hidden");
  const [page, setPage] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentFilter, checkInFilter, hiddenFilter]);

  // Server state
  const eventQuery = useEvent(eventId);
  const event = eventQuery.data;

  const registrationsParams = {
    search: debouncedSearch,
    page,
    pageSize: 50,
    paymentStatus: paymentFilter,
    hiddenFilter,
    checkInFilter,
  };

  const registrationsQuery = useRegistrations(eventId, registrationsParams);
  const registrationsData = registrationsQuery.data;

  const registrationDetailQuery = useRegistrationDetail(eventId, selectedRegistrationId);
  const selectedRegistration = registrationDetailQuery.data ?? null;

  const updateRegistration = useUpdateRegistration(eventId);
  const checkInMutation = useCheckIn(eventId, selectedRegistrationId);

  // Derived values
  const registrations = registrationsData?.registrations ?? [];
  const visibleRegistrationCount =
    hiddenFilter === "non_hidden"
      ? registrationsData?.pagination?.total ?? 0
      : registrationsData?.registrations?.length ?? 0;

  // 依目前篩選條件匯出 CSV（GET + cookie 認證，瀏覽器直接下載）
  const handleExportCsv = () => {
    const qs = new URLSearchParams({
      ...(debouncedSearch && { search: debouncedSearch }),
      paymentStatus: paymentFilter,
      hiddenFilter,
      checkInFilter,
    });
    window.location.href = `/api/events/${eventId}/registrations/export?${qs}`;
  };

  if (eventQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full flex-1 flex-col max-w-4xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex border-b border-gray-200 bg-white px-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-12 mx-2 my-1.5 rounded" />
          ))}
        </div>
        <div className="flex-1 p-4 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">
          {eventQuery.error instanceof Error
            ? eventQuery.error.message
            : "找不到活動"}
        </p>
        <Link href="/events" className="mt-2 inline-block text-brand underline">
          返回活動列表
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-1 flex-col max-w-4xl">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">
          {event.title}
        </h1>
        <Link
          href="/events"
          className="flex items-center justify-center text-gray-600 hover:underline"
          aria-label="返回所有活動"
        >
          返回列表
        </Link>
      </div>
      <div className="flex border-b border-gray-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedRegistrationId(null);
            }}
            className={`relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "text-brand"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.id === "replies" && visibleRegistrationCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs font-medium text-white">
                {visibleRegistrationCount}
              </span>
            )}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
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
            onSaveSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ["event", eventId] })
            }
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
            {selectedRegistrationId && registrationDetailQuery.isLoading ? (
              <RegistrationDetailSkeleton onBack={() => setSelectedRegistrationId(null)} />
            ) : selectedRegistration ? (
              <RegistrationDetail
                registration={selectedRegistration}
                currentIndex={registrations.findIndex((r) => r.id === selectedRegistrationId)}
                totalCount={registrations.length}
                onBack={() => {
                  setSelectedRegistrationId(null);
                }}
                onPrevious={() => {
                  const currentIdx = registrations.findIndex((r) => r.id === selectedRegistrationId);
                  if (currentIdx > 0) {
                    setSelectedRegistrationId(registrations[currentIdx - 1].id);
                  }
                }}
                onNext={() => {
                  const currentIdx = registrations.findIndex((r) => r.id === selectedRegistrationId);
                  if (currentIdx < registrations.length - 1) {
                    setSelectedRegistrationId(registrations[currentIdx + 1].id);
                  }
                }}
                onStatusUpdate={async (status) => {
                  if (selectedRegistrationId) {
                    await updateRegistration.mutateAsync({
                      registrationId: selectedRegistrationId,
                      patch: { paymentStatus: status },
                    });
                  }
                }}
                onHiddenToggle={async (hidden) => {
                  if (selectedRegistrationId) {
                    await updateRegistration.mutateAsync({
                      registrationId: selectedRegistrationId,
                      patch: { hidden },
                    });
                  }
                }}
                onCheckIn={async (attendeeId) => {
                  await checkInMutation.mutateAsync(attendeeId);
                }}
                onEdit={() => setEditOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleExportCsv}
                    disabled={registrations.length === 0}
                    className="gap-1.5"
                  >
                    <Download className="size-4" />
                    匯出 CSV
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setWalkInOpen(true)}
                    className="gap-1.5 bg-brand text-white hover:bg-brand-hover"
                  >
                    <UserPlus className="size-4" />
                    現場報名
                  </Button>
                </div>
                <RegistrationsList
                  registrations={registrations}
                  onSelect={(id) => setSelectedRegistrationId(id)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                paymentFilter={paymentFilter}
                onPaymentFilterChange={setPaymentFilter}
                checkInFilter={checkInFilter}
                onCheckInFilterChange={setCheckInFilter}
                hiddenFilter={hiddenFilter}
                onHiddenFilterChange={setHiddenFilter}
                  totalUnfilteredCount={registrationsData?.pagination?.total ?? 0}
                  isLoading={registrationsQuery.isLoading}
                />
              </div>
            )}
            {!selectedRegistration &&
              registrationsData?.pagination &&
              registrationsData.pagination.total > registrationsData.pagination.pageSize && (
                <div className="flex items-center justify-between px-1 py-2 text-sm text-gray-600">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一頁
                  </Button>
                  <span>
                    第 {page} /{" "}
                    {Math.ceil(
                      registrationsData.pagination.total /
                        registrationsData.pagination.pageSize
                    )}{" "}
                    頁
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page >=
                      Math.ceil(
                        registrationsData.pagination.total /
                          registrationsData.pagination.pageSize
                      )
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              )}
          </>
        )}
        {activeTab === "stats" && eventId && (
          <EventStats eventId={eventId} />
        )}
        {activeTab === "verify" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                掃描參加者的 QR code 來確認入場
              </p>
              <Button
                onClick={() => {
                  window.location.href = `/events/${eventId}/scan`;
                }}
                className="w-full bg-brand text-white hover:bg-brand-hover h-12 text-base font-medium"
              >
                開啟掃描器
              </Button>
            </div>
          </div>
        )}
      </div>

      <WalkInDrawer
        open={walkInOpen}
        eventId={event.id}
        onClose={() => setWalkInOpen(false)}
      />

      {selectedRegistration && (
        <RegistrationEditDrawer
          open={editOpen}
          registration={selectedRegistration}
          onClose={() => setEditOpen(false)}
          onSave={async (patch) => {
            if (selectedRegistrationId) {
              await updateRegistration.mutateAsync({
                registrationId: selectedRegistrationId,
                patch,
              });
            }
          }}
        />
      )}
    </div>
  );
}
