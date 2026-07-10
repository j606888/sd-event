"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CheckCircle2, Eye, EyeOff, QrCode, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScannedRegistrationDetail } from "./ScannedRegistrationDetail";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RoleBadge } from "./RoleBadge";
import { formatTimestamp } from "@/lib/format-event-date";
import type { RegistrationDetailData } from "@/types/registration";

type RegistrationDetailProps = {
  registration: RegistrationDetailData;
  currentIndex: number;
  totalCount: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStatusUpdate: (status: "confirmed") => Promise<void>;
  onHiddenToggle?: (hidden: boolean) => Promise<void>;
  onCheckIn: (attendeeId: number) => Promise<void>;
  onEdit?: () => void;
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
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-16" />
        <div className="space-y-2">
          {["姓名", "電話", "信箱"].map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-16" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-50">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
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
}: RegistrationDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [hiddenUpdating, setHiddenUpdating] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const handleConfirm = async () => {
    const notPaid = registration.paymentStatus === "pending";
    if (notPaid && !window.confirm("用戶尚未付錢，確定要嗎？")) {
      return;
    }
    setUpdating(true);
    try {
      await onStatusUpdate("confirmed");
    } finally {
      setUpdating(false);
    }
  };

  const handleHiddenToggle = async () => {
    if (!onHiddenToggle) return;
    setHiddenUpdating(true);
    try {
      await onHiddenToggle(!registration.hidden);
    } finally {
      setHiddenUpdating(false);
    }
  };

  const attendeeCount = registration.attendees.length;
  const showConfirmButton =
    registration.paymentStatus === "pending" || registration.paymentStatus === "reported";

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">返回列表</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {totalCount}
          </span>
          <button
            onClick={onNext}
            disabled={currentIndex === totalCount - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {registration.contactName}
            </h2>
            <div className="text-sm text-gray-600 mt-1">
              {attendeeCount}人 · NT ${registration.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {registration.source === "walk_in" && (
              <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 rounded-full text-xs font-medium text-emerald-700">
                現場
              </span>
            )}
            {registration.hidden && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 rounded-full text-xs font-medium text-amber-800">
                <EyeOff className="w-3 h-3" />
                已隱藏
              </span>
            )}
            <PaymentStatusBadge status={registration.paymentStatus} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{formatTimestamp(registration.createdAt)}</span>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                編輯
              </Button>
            )}
            {onHiddenToggle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={hiddenUpdating}
                onClick={handleHiddenToggle}
                className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                {registration.hidden ? (
                  <>
                    <Eye className="w-4 h-4" />
                    {hiddenUpdating ? "處理中…" : "取消隱藏"}
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    {hiddenUpdating ? "處理中…" : "標記為隱藏"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">聯絡人</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">姓名</span>
            <span className="ml-2 text-gray-900">{registration.contactName}</span>
          </div>
          <div>
            <span className="text-gray-500">電話</span>
            <span className="ml-2 text-gray-900">{registration.contactPhone || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">信箱</span>
            <span className="ml-2 text-gray-900">{registration.contactEmail || "—"}</span>
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">參與者</h3>
          <Button
            onClick={() => setShowCheckInDialog(true)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <QrCode className="w-4 h-4" />
            手動入場
          </Button>
        </div>
        <div className="space-y-2">
          {registration.attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between p-2 rounded bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{attendee.name}</span>
                <RoleBadge role={attendee.role} />
              </div>
              {attendee.checkedIn ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>已入場</span>
                </div>
              ) : (
                <span className="text-xs text-gray-500">未入場</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Registration Items */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">報名項目</h3>
        <div className="space-y-2 text-sm">
          {registration.purchaseItems && registration.purchaseItems.length > 0 ? (
            // Multiple purchase items
            registration.purchaseItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-900">{item.name}</span>
                <span className="text-gray-900">${item.amount}</span>
              </div>
            ))
          ) : registration.purchaseItem ? (
            // Single purchase item (backward compatibility)
            <div className="flex justify-between">
              <span className="text-gray-900">{registration.purchaseItem.name}</span>
              <span className="text-gray-900">${registration.purchaseItem.amount}</span>
            </div>
          ) : null}
          {(registration.discountAmount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                折扣碼
                {registration.couponCode && (
                  <span className="ml-1 font-mono text-gray-900">
                    {registration.couponCode}
                  </span>
                )}
              </span>
              <span className="text-brand">
                −${registration.discountAmount!.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">總金額</span>
            <span className="text-gray-900 font-semibold">
              {(registration.discountAmount ?? 0) > 0 && (
                <span className="mr-2 font-normal text-gray-400 line-through">
                  $
                  {(
                    registration.totalAmount + (registration.discountAmount ?? 0)
                  ).toLocaleString()}
                </span>
              )}
              ${registration.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">付款資料</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">付款方式</span>
            <span className="ml-2 text-gray-900">
              {registration.paymentMethod === "Cash"
                ? "現金"
                : registration.paymentMethod || "未指定"}
            </span>
          </div>
          {registration.paymentNote && (
            <div>
              <span className="text-gray-500">用戶備註</span>
              <span className="ml-2 text-gray-900">{registration.paymentNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Screenshot */}
      {registration.paymentScreenshotUrl && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">付款證明</h3>
          <button
            type="button"
            onClick={() => setImagePreviewOpen(true)}
            className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-zoom-in"
          >
            <Image
              src={registration.paymentScreenshotUrl}
              alt="付款截圖"
              fill
              className="object-contain"
            />
          </button>
        </div>
      )}

      {/* Confirm Button */}
      {showConfirmButton && (
        <Button
          onClick={handleConfirm}
          disabled={updating}
          className="w-full bg-brand text-white hover:bg-brand-hover h-12 text-base font-medium"
        >
          {updating ? "處理中…" : "標記為已完成"}
        </Button>
      )}

      {/* Check-in Dialog */}
      {showCheckInDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">手動入場</h2>
              <button
                onClick={() => setShowCheckInDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Registration Detail */}
            <div className="p-4">
              <ScannedRegistrationDetail
                registration={{
                  id: registration.id,
                  registrationKey: registration.registrationKey,
                  contactName: registration.contactName,
                  totalAmount: registration.totalAmount,
                  paymentStatus: registration.paymentStatus,
                  purchaseItem: registration.purchaseItem,
                  purchaseItems: registration.purchaseItems,
                  attendees: registration.attendees.map((a) => ({
                    id: a.id,
                    name: a.name,
                    role: a.role,
                    checkedIn: a.checkedIn || false,
                    checkedInAt: a.checkedInAt || null,
                  })),
                }}
                onBack={() => setShowCheckInDialog(false)}
                onCheckIn={async (attendeeId) => {
                  await onCheckIn(attendeeId);
                  // Refresh registration detail after check-in
                  // The parent component should handle this
                }}
                backLabel="返回"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {imagePreviewOpen && registration.paymentScreenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
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
            <img
              src={registration.paymentScreenshotUrl}
              alt="付款截圖"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
