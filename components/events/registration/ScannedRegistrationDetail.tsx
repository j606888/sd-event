"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RoleBadge } from "./RoleBadge";
import type { ScannedRegistration } from "@/types/registration";

type ScannedRegistrationDetailProps = {
  registration: ScannedRegistration;
  /**
   * 管理員為 true，掃碼後顯示金額。驗票人員為 false：只顯示報名內容與付款狀態。
   * 付款狀態一定要留著 —— 門口靠它判斷未付款要不要放行。
   */
  canSeeMoney?: boolean;
  onBack: () => void;
  onCheckIn: (attendeeId: number) => Promise<void>;
  backLabel?: string;
};

export function ScannedRegistrationDetail({
  registration,
  canSeeMoney = true,
  onBack,
  onCheckIn,
  backLabel = "返回 QR Code 掃描",
}: ScannedRegistrationDetailProps) {
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [localAttendees, setLocalAttendees] = useState(registration.attendees);

  // Sync local state with prop changes (e.g., after parent refreshes data)
  useEffect(() => {
    setLocalAttendees(registration.attendees);
  }, [registration.attendees]);

  const handleCheckIn = async (attendeeId: number) => {
    setCheckingIn(attendeeId);
    try {
      await onCheckIn(attendeeId);
      // Update local state
      setLocalAttendees((prev) =>
        prev.map((a) =>
          a.id === attendeeId
            ? { ...a, checkedIn: true, checkedInAt: new Date().toISOString() }
            : a
        )
      );
    } catch (err) {
      console.error("Check-in failed:", err);
    } finally {
      setCheckingIn(null);
    }
  };

  const requestCheckIn = async (attendeeId: number) => {
    if (registration.paymentStatus !== "confirmed") {
      const shouldProceed = window.confirm(
        "此報名付款尚未確認，仍要讓此參與者入場嗎？"
      );
      if (!shouldProceed) return;
    }
    await handleCheckIn(attendeeId);
  };

  const attendeeCount = localAttendees.length;
  const allCheckedIn = localAttendees.every((a) => a.checkedIn);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">{backLabel}</span>
        </button>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {registration.contactName}
            </h2>
            <div className="text-sm text-gray-600 mt-1">
              {attendeeCount}人
              {canSeeMoney && registration.totalAmount != null &&
                ` · NT $${registration.totalAmount.toLocaleString()}`}
            </div>
            <div className="mt-2">
              <PaymentStatusBadge status={registration.paymentStatus} />
            </div>
          </div>
          {allCheckedIn && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              <span>已全員入場</span>
            </div>
          )}
        </div>
      </div>

      {/* Registration Item */}
      {(registration.purchaseItems && registration.purchaseItems.length > 0) || registration.purchaseItem ? (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">報名項目</h3>
          {registration.purchaseItems && registration.purchaseItems.length > 0 ? (
            // Multiple purchase items
            <div className="space-y-1">
              {registration.purchaseItems.map((item) => (
                <div key={item.id} className="text-sm text-gray-900">
                  {item.name}
                  {canSeeMoney && item.amount != null && ` $${item.amount}`}
                </div>
              ))}
            </div>
          ) : registration.purchaseItem ? (
            // Single purchase item (backward compatibility)
            <div className="text-sm text-gray-900">
              {registration.purchaseItem.name}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Participants */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">參與者</h3>
        <div className="space-y-2">
          {localAttendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">• {attendee.name}</span>
                <RoleBadge role={attendee.role} />
              </div>
              {attendee.checkedIn ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>已入場</span>
                </div>
              ) : (
                <Button
                  onClick={() => requestCheckIn(attendee.id)}
                  disabled={checkingIn === attendee.id}
                  size="sm"
                  className="bg-brand text-white hover:bg-brand-hover h-8 px-3 text-xs"
                >
                  {checkingIn === attendee.id ? "處理中…" : "入場"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
