"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EventEditTabs } from "@/components/events/management/EventEditTabs";
import { EventTabBar } from "@/components/events/management/EventTabBar";
import { EventStats } from "@/components/events/management/EventStats";
import { WalkInDrawer } from "@/components/events/management/WalkInDrawer";
import { RegistrationEditDrawer } from "@/components/events/management/RegistrationEditDrawer";
import { RegistrationsList } from "@/components/events/registration/RegistrationsList";
import { EventNumbersStrip } from "@/components/events/registration/EventNumbersStrip";
import { RegistrationDetail, RegistrationDetailSkeleton } from "@/components/events/registration/RegistrationDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Link2, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/use-event-detail";
import { useReadOnly } from "@/hooks/use-session";
import { useTeamRole } from "@/hooks/use-team-role";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getEventDateLabel } from "@/lib/format-event-date";
import { cn } from "@/lib/utils";
import { EVENT_TABS, FORM_TAB_IDS, STAFF_TAB_IDS, useTabParam } from "@/hooks/use-tab-param";
import {
  useRegistrations,
  useRegistrationDetail,
  useUpdateRegistration,
  useCheckIn,
  useUndoCheckIn,
  useResendConfirmationEmail,
  useRefundRegistration,
} from "@/hooks/use-registrations";
import type { PaymentFilter, CheckInFilter, HiddenFilter, CouponFilter, PurchaseItemFilter } from "@/lib/registration-list-filters";

function EventDetailSkeleton() {
  return (
    <div className="flex w-full max-w-7xl flex-1 flex-col">
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-5">
        <Skeleton className="mb-2 h-3.5 w-16" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex border-b border-hairline px-4 md:px-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-16 mx-2 my-1.5 rounded" />
        ))}
      </div>
      <div className="flex-1 px-4 py-5 md:px-8 space-y-6">
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

const ALL_TAB_IDS = EVENT_TABS.map((t) => t.id);

function EventDetailPageInner() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const queryClient = useQueryClient();
  const readOnly = useReadOnly();
  // 驗票人員只看得到驗票與報名名單，且名單上不顯示任何金額
  const { isAdmin, isLoading: roleLoading } = useTeamRole();
  const allowedTabs = isAdmin ? ALL_TAB_IDS : STAFF_TAB_IDS;

  const [shareCopied, setShareCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<number | null>(null);
  /** 跨頁前後筆導覽：換頁後要自動選取該頁的頭或尾 */
  const [pendingEdgeSelect, setPendingEdgeSelect] = useState<
    "first" | "last" | null
  >(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("all");
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("non_hidden");
  const [couponFilter, setCouponFilter] = useState<CouponFilter>("all");
  const [purchaseItemFilter, setPurchaseItemFilter] = useState<PurchaseItemFilter>("all");
  const [page, setPage] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentFilter, checkInFilter, hiddenFilter, couponFilter, purchaseItemFilter]);

  // Server state
  const eventQuery = useEvent(eventId);
  const event = eventQuery.data;

  // 分頁狀態同步至網址 ?tab=，可深連結、重新整理不跳走。
  // 開賣後進來是為了找人，所以預設落在報名者；還在草稿的活動才先帶到基本資訊。
  const [activeTab, setTab] = useTabParam(
    allowedTabs,
    isAdmin && event?.status === "draft" ? "basic" : "registrations"
  );
  // lg 以上明細開在名單右側；以下整頁切換
  const isWide = useMediaQuery("(min-width: 1024px)");

  const registrationsParams = {
    search: debouncedSearch,
    page,
    pageSize: 50,
    paymentStatus: paymentFilter,
    hiddenFilter,
    checkInFilter,
    couponFilter,
    purchaseItemFilter,
  };

  const registrationsQuery = useRegistrations(eventId, registrationsParams);
  const registrationsData = registrationsQuery.data;

  const registrationDetailQuery = useRegistrationDetail(eventId, selectedRegistrationId);
  const selectedRegistration = registrationDetailQuery.data ?? null;

  const updateRegistration = useUpdateRegistration(eventId);
  const refundRegistration = useRefundRegistration(eventId);
  const checkInMutation = useCheckIn(eventId);
  const undoCheckInMutation = useUndoCheckIn(eventId);
  const resendConfirmation = useResendConfirmationEmail(eventId);

  // 跨頁前後筆導覽：新的一頁載入後，把選取落在該頁的頭或尾
  useEffect(() => {
    if (!pendingEdgeSelect || registrationsQuery.isFetching) return;
    const rows = registrationsData?.registrations ?? [];
    if (rows.length === 0) {
      setPendingEdgeSelect(null);
      return;
    }
    const target =
      pendingEdgeSelect === "first" ? rows[0] : rows[rows.length - 1];
    setSelectedRegistrationId(target.id);
    setPendingEdgeSelect(null);
  }, [pendingEdgeSelect, registrationsQuery.isFetching, registrationsData]);

  // Derived values
  const registrations = registrationsData?.registrations ?? [];
  const pageSizeValue = registrationsData?.pagination?.pageSize ?? 50;
  const matchedTotal = registrationsData?.pagination?.total ?? registrations.length;
  const selectedIndexInPage = registrations.findIndex(
    (r) => r.id === selectedRegistrationId
  );
  /**
   * 前後筆導覽是跨頁的：畫面上顯示的是「第 N / 全部符合筆數」，
   * 走到當前頁邊界時換頁並選新頁的第一／最後一筆。
   */
  const selectedGlobalIndex =
    selectedIndexInPage < 0
      ? -1
      : (page - 1) * pageSizeValue + selectedIndexInPage;
  const visibleRegistrationCount =
    hiddenFilter === "non_hidden"
      ? registrationsData?.pagination?.total ?? 0
      : registrationsData?.registrations?.length ?? 0;

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) throw new Error("發布失敗，請稍後再試");
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "發布失敗，請稍後再試");
    } finally {
      setPublishing(false);
    }
  };

  // 統計分頁的款項／入場／報名項目點下去，跳到「報名者」並套用對應篩選。
  // 未指定的篩選重設為「全部」，避免上次留下的條件把結果篩空。
  const handleStatsDrillDown = ({
    payment,
    checkIn,
    purchaseItemId,
  }: {
    payment?: PaymentFilter;
    checkIn?: CheckInFilter;
    purchaseItemId?: number;
  }) => {
    setPaymentFilter(payment ?? "all");
    setCheckInFilter(checkIn ?? "all");
    setPurchaseItemFilter(purchaseItemId ?? "all");
    setPage(1);
    setSelectedRegistrationId(null);
    setTab("registrations");
  };

  // 依目前篩選條件匯出 CSV（GET + cookie 認證，瀏覽器直接下載）
  const handleExportCsv = () => {
    const qs = new URLSearchParams({
      ...(debouncedSearch && { search: debouncedSearch }),
      paymentStatus: paymentFilter,
      hiddenFilter,
      checkInFilter,
      couponFilter,
      ...(purchaseItemFilter !== "all" && { purchaseItemId: String(purchaseItemFilter) }),
    });
    window.location.href = `/api/events/${eventId}/registrations/export?${qs}`;
  };

  // 角色未知前先顯示骨架，避免驗票人員閃過一瞬間的管理分頁與金額
  if (eventQuery.isLoading || roleLoading) {
    return <EventDetailSkeleton />;
  }

  if (eventQuery.error || !event) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">
          {eventQuery.error instanceof Error
            ? eventQuery.error.message
            : "找不到活動"}
        </p>
        <Link href="/events" className="mt-2 inline-block text-brand-strong underline">
          返回活動列表
        </Link>
      </div>
    );
  }

  const isFormTab = isAdmin && (FORM_TAB_IDS as readonly string[]).includes(activeTab);

  return (
    <div className="flex w-full max-w-7xl flex-1 flex-col">
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-5">
        {/* 麵包屑返回：桌機慣例放在標題上方左側 */}
        <Link
          href="/events"
          className="group mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-ink transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          所有活動
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-64">
            <div className="flex items-center gap-2.5">
              <h1 className="min-w-0 truncate font-display text-xl font-bold text-ink md:text-[28px] md:leading-tight">
                {event.title}
              </h1>
              {event.status === "draft" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-butter-soft px-2.5 py-0.5 text-xs font-bold text-butter-ink">
                  <span className="size-1.5 rounded-full bg-butter" aria-hidden />
                  草稿
                </span>
              ) : new Date(event.endAt) < new Date() ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-field px-2.5 py-0.5 text-xs font-bold text-muted-ink">
                  已結束
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-strong">
                  <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                  售票中
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-ink">
              {getEventDateLabel(event.startAt, event.endAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.publicKey}`;
                navigator.clipboard.writeText(url).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                });
              }}
              className={cn(
                "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition-colors",
                shareCopied
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-gray-300 bg-white text-ink hover:border-ink"
              )}
            >
              {shareCopied ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {shareCopied ? "已複製連結" : "分享表單"}
            </button>
            {event.status === "draft" && isAdmin ? (
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || readOnly}
                title={readOnly ? "模擬檢視為唯讀模式" : undefined}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-butter px-4 text-sm font-bold text-ink transition-colors hover:bg-butter-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing ? "發布中…" : "發布"}
              </button>
            ) : (
              /* 手機的現場報名在底部導覽列，這顆只給 sm 以上 */
              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                disabled={readOnly}
                title={readOnly ? "模擬檢視為唯讀模式" : undefined}
                className="hidden h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-ink transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              >
                <UserPlus className="size-4" />
                現場報名
              </button>
            )}
          </div>
        </div>
      </div>
      {publishError && (
        <p className="flex items-center gap-1.5 px-4 pb-2 text-sm text-red-600 md:px-8">
          <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
          {publishError}
        </p>
      )}
      {event.status === "draft" && (
        <p className="flex items-center gap-1.5 px-4 pb-2 text-xs text-butter-ink md:px-8">
          <span className="size-1.5 shrink-0 rounded-full bg-butter" aria-hidden />
          活動尚未發布：報名連結僅團隊成員能預覽，按「發布」後才對外開放報名。
        </p>
      )}
      {/* 分頁導覽：sm 以上為上方分頁，手機為固定底部導覽列 */}
      <div className="px-4 md:px-8">
        <EventTabBar
          activeTab={activeTab}
          tabIds={allowedTabs}
          registrationCount={visibleRegistrationCount}
          onSelect={(tab) => {
            setTab(tab);
            setSelectedRegistrationId(null);
          }}
          onWalkIn={readOnly ? undefined : () => setWalkInOpen(true)}
        />
      </div>

      {/* Tab content（手機底部預留導覽列高度） */}
      <div className="flex-1 px-4 pt-5 pb-24 sm:pb-8 md:px-8 md:pt-6">
        {/* 表單三分頁常駐 mounted：未儲存的編輯在切到其他分頁時不會消失 */}
        {isAdmin && (
        <div className={isFormTab ? "" : "hidden"}>
          <EventEditTabs
            teamId={event.teamId}
            eventId={event.id}
            initialData={event}
            activeTab={activeTab}
            setTab={setTab}
            onSaveSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ["event", eventId] })
            }
          />
        </div>
        )}
        {activeTab === "registrations" && (
          <div className="space-y-4">
            {/* 明細開著時手機只看明細；桌機名單與數字列一直都在 */}
            <div className={cn(selectedRegistrationId !== null && "hidden lg:block")}>
              <EventNumbersStrip
                eventId={eventId}
                onShowAll={() => handleStatsDrillDown({})}
                onShowNotEntered={() => handleStatsDrillDown({ checkIn: "not_all" })}
                onShowAwaitingConfirmation={() => handleStatsDrillDown({ payment: "reported" })}
              />
            </div>
            <div
              className={cn(
                "grid items-start gap-5",
                selectedRegistrationId !== null && "lg:grid-cols-[minmax(0,1fr)_380px]"
              )}
            >
              <div
                className={cn(
                  "min-w-0 space-y-3",
                  selectedRegistrationId !== null && "hidden lg:block"
                )}
              >
                <RegistrationsList
                  eventId={eventId}
                  registrations={registrations}
                  canManage={isAdmin}
                  selectedId={selectedRegistrationId}
                  onSelect={(id) => setSelectedRegistrationId(id)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  paymentFilter={paymentFilter}
                  onPaymentFilterChange={setPaymentFilter}
                  checkInFilter={checkInFilter}
                  onCheckInFilterChange={setCheckInFilter}
                  hiddenFilter={hiddenFilter}
                  onHiddenFilterChange={setHiddenFilter}
                  couponFilter={couponFilter}
                  onCouponFilterChange={setCouponFilter}
                  purchaseItemFilter={purchaseItemFilter}
                  onPurchaseItemFilterChange={setPurchaseItemFilter}
                  purchaseItemOptions={registrationsData?.purchaseItemOptions ?? []}
                  matchedTotal={matchedTotal}
                  isLoading={registrationsQuery.isLoading}
                  onWalkIn={() => setWalkInOpen(true)}
                  onExportCsv={isAdmin ? handleExportCsv : undefined}
                />
                {registrationsData?.pagination &&
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
              </div>

              {selectedRegistrationId !== null && (
                <div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto surface-card p-4 lg:p-5">
                  {registrationDetailQuery.isLoading || !selectedRegistration ? (
                    <RegistrationDetailSkeleton onBack={() => setSelectedRegistrationId(null)} />
                  ) : (
                    <RegistrationDetail
                      layout={isWide ? "panel" : "page"}
                      registration={selectedRegistration}
                      canManage={isAdmin}
                      currentIndex={selectedGlobalIndex}
                      totalCount={matchedTotal}
                      onBack={() => {
                        setSelectedRegistrationId(null);
                      }}
                      onPrevious={() => {
                        if (selectedIndexInPage > 0) {
                          setSelectedRegistrationId(registrations[selectedIndexInPage - 1].id);
                        } else if (page > 1) {
                          // 走到本頁第一筆：往前翻一頁並選該頁最後一筆
                          setPendingEdgeSelect("last");
                          setPage((p) => p - 1);
                        }
                      }}
                      onNext={() => {
                        if (
                          selectedIndexInPage >= 0 &&
                          selectedIndexInPage < registrations.length - 1
                        ) {
                          setSelectedRegistrationId(registrations[selectedIndexInPage + 1].id);
                        } else if (selectedGlobalIndex < matchedTotal - 1) {
                          // 走到本頁最後一筆：往後翻一頁並選該頁第一筆
                          setPendingEdgeSelect("first");
                          setPage((p) => p + 1);
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
                      onResendEmail={async () => {
                        if (selectedRegistrationId) {
                          await resendConfirmation.mutateAsync(selectedRegistrationId);
                        }
                      }}
                      onUndoCheckIn={async (attendeeId) => {
                        await undoCheckInMutation.mutateAsync(attendeeId);
                      }}
                      onRefund={async (refund) => {
                        if (selectedRegistrationId) {
                          await refundRegistration.mutateAsync({
                            registrationId: selectedRegistrationId,
                            refund,
                          });
                        }
                      }}
                      onUndoRefund={async () => {
                        if (selectedRegistrationId) {
                          await refundRegistration.mutateAsync({
                            registrationId: selectedRegistrationId,
                            refund: null,
                          });
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "stats" && eventId && isAdmin && (
          <EventStats
            eventId={eventId}
            onFilterRegistrations={handleStatsDrillDown}
          />
        )}
      </div>

      <WalkInDrawer
        open={walkInOpen}
        canOverrideAmount={isAdmin}
        eventId={event.id}
        onClose={() => setWalkInOpen(false)}
      />

      {selectedRegistration && isAdmin && (
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

export default function EventDetailPage() {
  // useSearchParams（useTabParam）需要 Suspense boundary，否則 build 會失敗
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetailPageInner />
    </Suspense>
  );
}
