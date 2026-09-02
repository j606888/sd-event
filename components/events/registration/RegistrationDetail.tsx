"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  MailCheck,
  Pencil,
  Phone,
  QrCode,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmActionDrawer } from "./ConfirmActionDrawer";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RoleBadge } from "./RoleBadge";
import { formatClockTime, formatTimestamp } from "@/lib/format-event-date";
import { useReadOnly } from "@/hooks/use-session";
import type { RegistrationDetailData } from "@/types/registration";

type RegistrationDetailProps = {
  registration: RegistrationDetailData;
  /** 在所有符合條件的報名中的位置（0-based），跨頁 */
  currentIndex: number;
  /** 符合目前篩選的總筆數，非當前頁筆數 */
  totalCount: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStatusUpdate: (status: "confirmed" | "rejected") => Promise<void>;
  onHiddenToggle?: (hidden: boolean) => Promise<void>;
  onCheckIn: (attendeeId: number) => Promise<void>;
  onEdit?: () => void;
  onResendEmail?: () => Promise<void>;
};

export function RegistrationDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <div className="flex items-center gap-2">
          <Skeleton className="size-[34px] rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="size-[34px] rounded-lg" />
        </div>
      </div>
      <div className="space-y-2 border-b border-hairline pb-5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

/** 區塊標題，整頁共用同一種字級與字重 */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-sm font-bold text-ink">{children}</h3>;
}

/** 可點擊（撥號／寄信）＋ 一鍵複製的聯絡方式列 */
function ContactRow({
  icon: Icon,
  href,
  value,
  copyLabel,
}: {
  icon: React.ElementType;
  href: string;
  value: string;
  copyLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-field px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-gray-400" />
      <a
        href={href}
        className="min-w-0 flex-1 truncate text-sm font-medium text-brand hover:text-brand-hover hover:underline"
      >
        {value}
      </a>
      <button
        type="button"
        aria-label={copyLabel}
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => setCopied(true));
        }}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white text-gray-400 transition-colors hover:text-gray-600"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export function RegistrationDetail({
  registration,
  currentIndex,
  totalCount,
  onBack,
  onPrevious,
  onNext,
  onStatusUpdate,
  onHiddenToggle,
  onCheckIn,
  onEdit,
  onResendEmail,
}: RegistrationDetailProps) {
  const readOnly = useReadOnly();
  const [updating, setUpdating] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  // 入場：per-attendee 的處理中狀態，避免整區一起 disabled
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [checkingInAll, setCheckingInAll] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  /** 未確認收款時，入場要先跳確認；記住是哪一位（null = 全部） */
  const [pendingCheckIn, setPendingCheckIn] = useState<
    { attendeeId: number | null } | null
  >(null);

  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [hiddenConfirmOpen, setHiddenConfirmOpen] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  const attendees = registration.attendees;
  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const notCheckedIn = attendees.filter((a) => !a.checkedIn);
  const paymentConfirmed = registration.paymentStatus === "confirmed";
  const isAwaitingPayment =
    registration.paymentStatus === "pending" ||
    registration.paymentStatus === "reported";

  const runCheckIn = async (attendeeId: number | null) => {
    setCheckInError(null);
    const targets =
      attendeeId === null ? notCheckedIn.map((a) => a.id) : [attendeeId];
    if (attendeeId === null) setCheckingInAll(true);
    try {
      // 人數很少（一筆報名通常 1–4 人），依序送即可，不另開批次端點
      for (const id of targets) {
        setCheckingInId(id);
        await onCheckIn(id);
      }
    } catch (e) {
      setCheckInError(e instanceof Error ? e.message : "入場失敗，請重試");
    } finally {
      setCheckingInId(null);
      setCheckingInAll(false);
    }
  };

  /** 未確認收款就要放人進場時，先確認一次（原本是 window.confirm） */
  const requestCheckIn = (attendeeId: number | null) => {
    if (!paymentConfirmed) {
      setPendingCheckIn({ attendeeId });
      return;
    }
    void runCheckIn(attendeeId);
  };

  const handleConfirmPayment = async () => {
    setUpdating(true);
    try {
      await onStatusUpdate("confirmed");
    } finally {
      setUpdating(false);
    }
  };

  const handleResend = async () => {
    if (!onResendEmail) return;
    setResendState("sending");
    setResendError(null);
    try {
      await onResendEmail();
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 2500);
    } catch (e) {
      setResendState("idle");
      setResendError(e instanceof Error ? e.message : "重寄失敗");
    }
  };

  const canResend = paymentConfirmed && !!registration.contactEmail;

  return (
    <div className="w-full space-y-6">
      {/* 前後筆導覽 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-3 text-sm text-gray-600 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={currentIndex <= 0}
            aria-label="上一筆"
            className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-hairline bg-white text-gray-500 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[84px] text-center font-display text-[13px] tabular-nums text-gray-600">
            第 {currentIndex + 1} / {totalCount} 筆
          </span>
          <button
            onClick={onNext}
            disabled={currentIndex >= totalCount - 1}
            aria-label="下一筆"
            className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-hairline bg-white text-gray-500 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* 標題 + 主要動作 */}
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl font-bold text-ink">
              {registration.contactName}
            </h2>
            <PaymentStatusBadge status={registration.paymentStatus} />
            {registration.hidden && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                <EyeOff className="size-3" />
                已隱藏
              </span>
            )}
          </div>
          <div className="font-display text-sm tabular-nums text-gray-600">
            {attendees.length} 人 · NT${registration.totalAmount.toLocaleString()} ·{" "}
            {registration.source === "walk_in" ? "現場報名" : "線上報名"}{" "}
            {formatTimestamp(registration.createdAt)}
          </div>
        </div>

        {!readOnly && (
          <div className="flex shrink-0 items-center gap-2">
            {isAwaitingPayment ? (
              <Button
                type="button"
                disabled={updating}
                onClick={() => {
                  // 已回報付款的直接送出；完全沒回報的先確認一次
                  if (registration.paymentStatus === "pending") {
                    setConfirmPaymentOpen(true);
                  } else {
                    void handleConfirmPayment();
                  }
                }}
                className="h-[38px] gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                <CheckCircle2 className="size-4" />
                {updating ? "處理中…" : "確認收款"}
              </Button>
            ) : (
              onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEdit}
                  className="h-[38px] gap-1.5 px-3.5"
                >
                  <Pencil className="size-4" />
                  編輯
                </Button>
              )
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="更多操作"
                  className="size-[38px] bg-field p-0"
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAwaitingPayment && onEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil />
                    編輯報名資料
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!canResend || resendState === "sending"}
                  onSelect={(e) => {
                    e.preventDefault();
                    void handleResend();
                  }}
                >
                  <MailCheck />
                  {resendState === "sending"
                    ? "寄送中…"
                    : resendState === "sent"
                    ? "已重寄"
                    : "重寄確認信"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    window.open(
                      `/entry-voucher/${registration.registrationKey}`,
                      "_blank",
                      "noopener"
                    )
                  }
                >
                  <QrCode />
                  檢視入場 QR 憑證
                </DropdownMenuItem>
                {onHiddenToggle && (
                  <DropdownMenuItem onSelect={() => setHiddenConfirmOpen(true)}>
                    {registration.hidden ? <Eye /> : <EyeOff />}
                    {registration.hidden ? "取消隱藏" : "標記為隱藏"}
                  </DropdownMenuItem>
                )}
                {registration.paymentStatus !== "rejected" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setRejectOpen(true)}
                    >
                      <X />
                      拒絕這筆付款
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {resendError && <p className="text-sm text-red-500">{resendError}</p>}

      {/* 雙欄：左邊是要操作的，右邊是要核對的 */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <div className="space-y-7">
          {/* 聯絡人 */}
          <section className="space-y-3">
            <SectionHeading>聯絡人</SectionHeading>
            {registration.contactPhone || registration.contactEmail ? (
              <div className="space-y-1.5">
                {registration.contactPhone && (
                  <ContactRow
                    icon={Phone}
                    href={`tel:${registration.contactPhone}`}
                    value={registration.contactPhone}
                    copyLabel="複製電話"
                  />
                )}
                {registration.contactEmail && (
                  <ContactRow
                    icon={Mail}
                    href={`mailto:${registration.contactEmail}`}
                    value={registration.contactEmail}
                    copyLabel="複製信箱"
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">沒有留下聯絡方式</p>
            )}
          </section>

          {/* 參與者 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionHeading>
                參與者{" "}
                <span className="font-display text-xs font-medium tabular-nums text-gray-400">
                  {checkedInCount} / {attendees.length} 已入場
                </span>
              </SectionHeading>
              {!readOnly && notCheckedIn.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={checkingInAll}
                  onClick={() => requestCheckIn(null)}
                  className="gap-1.5"
                >
                  <Check className="size-3.5" />
                  {checkingInAll ? "處理中…" : "全部入場"}
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-2.5 rounded-lg bg-field py-1.5 pl-3 pr-1.5"
                >
                  <span className="truncate text-sm font-medium text-ink">
                    {attendee.name}
                  </span>
                  <RoleBadge role={attendee.role} />
                  <span className="flex-1" />
                  {attendee.checkedIn ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      <CheckCircle2 className="size-3" />
                      已入場
                      {attendee.checkedInAt && (
                        <span className="font-display tabular-nums">
                          {formatClockTime(attendee.checkedInAt)}
                        </span>
                      )}
                    </span>
                  ) : readOnly ? (
                    <span className="shrink-0 pr-1.5 text-xs text-gray-400">未入場</span>
                  ) : (
                    <Button
                      type="button"
                      disabled={checkingInId === attendee.id || checkingInAll}
                      onClick={() => requestCheckIn(attendee.id)}
                      className="h-11 shrink-0 gap-1.5 bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90"
                    >
                      <Check className="size-4" />
                      {checkingInId === attendee.id ? "處理中…" : "入場"}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {checkInError && <p className="text-sm text-red-500">{checkInError}</p>}
          </section>

          {/* 報名項目 */}
          <section className="space-y-3">
            <SectionHeading>報名項目</SectionHeading>
            <div className="space-y-2.5 text-sm">
              {registration.purchaseItems && registration.purchaseItems.length > 0
                ? registration.purchaseItems.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span className="text-gray-900">
                        {item.name}
                        {item.tierName && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            （{item.tierName}）
                          </span>
                        )}
                      </span>
                      <span className="font-display tabular-nums text-gray-900">
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                : registration.purchaseItem && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-900">
                        {registration.purchaseItem.name}
                      </span>
                      <span className="font-display tabular-nums text-gray-900">
                        {registration.purchaseItem.amount.toLocaleString()}
                      </span>
                    </div>
                  )}

              {(registration.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">
                    折扣碼
                    {registration.couponCode && (
                      <span className="ml-1.5 font-display font-semibold text-gray-900">
                        {registration.couponCode}
                      </span>
                    )}
                  </span>
                  <span className="font-display tabular-nums text-brand">
                    −{registration.discountAmount!.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-3 border-t border-hairline pt-2.5">
                <span className="text-gray-500">應收總額</span>
                <span className="font-display font-bold tabular-nums text-ink">
                  {(registration.discountAmount ?? 0) > 0 && (
                    <span className="mr-2 font-normal text-gray-400 line-through">
                      {(
                        registration.totalAmount + (registration.discountAmount ?? 0)
                      ).toLocaleString()}
                    </span>
                  )}
                  NT${registration.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* 右欄：核對用 */}
        <div className="space-y-7">
          <section className="space-y-3">
            <SectionHeading>付款資料</SectionHeading>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="w-14 shrink-0 text-gray-400">方式</span>
                <span className="text-gray-900">
                  {registration.paymentMethod === "Cash"
                    ? "現金"
                    : registration.paymentMethod || "未指定"}
                </span>
              </div>
              {registration.paymentNote && (
                <div className="flex gap-3">
                  <span className="w-14 shrink-0 text-gray-400">備註</span>
                  <span className="min-w-0 break-words text-gray-900">
                    {registration.paymentNote}
                  </span>
                </div>
              )}
            </div>
          </section>

          {registration.paymentScreenshotUrl && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeading>付款證明</SectionHeading>
                <a
                  href={registration.paymentScreenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover"
                >
                  <ExternalLink className="size-3.5" />
                  原圖
                </a>
              </div>
              <button
                type="button"
                onClick={() => setImagePreviewOpen(true)}
                className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg border border-hairline bg-gray-100"
              >
                <Image
                  src={registration.paymentScreenshotUrl}
                  alt="付款截圖"
                  fill
                  className="object-contain"
                />
              </button>
            </section>
          )}
        </div>
      </div>

      {/* 未回報付款就要確認收款 */}
      <ConfirmActionDrawer
        open={confirmPaymentOpen}
        onClose={() => setConfirmPaymentOpen(false)}
        title="確認收款？"
        description="這筆報名還沒有回報付款。確認後系統會寄出收款確認信，狀態改為「已確認收款」。"
        summary={
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600">
              {registration.contactName} · {attendees.length} 人
            </span>
            <span className="font-display font-bold tabular-nums text-ink">
              NT${registration.totalAmount.toLocaleString()}
            </span>
          </div>
        }
        confirmLabel="仍要確認收款"
        pendingLabel="處理中…"
        onConfirm={handleConfirmPayment}
      />

      {/* 拒絕付款 */}
      <ConfirmActionDrawer
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="拒絕這筆付款？"
        description="狀態會改為「已拒絕」。報名者仍可從自己的報名連結重新回報付款。"
        confirmLabel="拒絕付款"
        pendingLabel="處理中…"
        destructive
        onConfirm={() => onStatusUpdate("rejected")}
      />

      {/* 隱藏／取消隱藏 */}
      <ConfirmActionDrawer
        open={hiddenConfirmOpen}
        onClose={() => setHiddenConfirmOpen(false)}
        title={registration.hidden ? "取消隱藏？" : "標記為隱藏？"}
        description={
          registration.hidden
            ? "這筆報名會重新出現在預設的報名者列表與統計中。"
            : "隱藏後這筆報名不會出現在預設的報名者列表與統計裡，但資料仍然保留，之後可以取消隱藏。"
        }
        confirmLabel={registration.hidden ? "取消隱藏" : "標記為隱藏"}
        pendingLabel="處理中…"
        onConfirm={async () => {
          if (onHiddenToggle) await onHiddenToggle(!registration.hidden);
        }}
      />

      {/* 未確認收款仍要入場 */}
      <ConfirmActionDrawer
        open={pendingCheckIn !== null}
        onClose={() => setPendingCheckIn(null)}
        title="尚未確認收款"
        description="這筆報名的款項還沒確認。仍要讓參與者入場嗎？"
        confirmLabel="仍要入場"
        pendingLabel="處理中…"
        onConfirm={async () => {
          const target = pendingCheckIn;
          setPendingCheckIn(null);
          if (target) await runCheckIn(target.attendeeId);
        }}
      />

      {/* 付款截圖 lightbox */}
      {imagePreviewOpen && registration.paymentScreenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setImagePreviewOpen(false)}
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="關閉"
          >
            <X className="size-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={registration.paymentScreenshotUrl}
              alt="付款截圖"
              className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
