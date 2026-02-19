"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CheckCircle2, Cloud, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannedRegistrationDetail } from "./ScannedRegistrationDetail";

type Attendee = {
  id: number;
  name: string;
  role: "Leader" | "Follower" | "Not sure" | string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
};

type PurchaseItem = {
  id: number;
  name: string;
  amount: number;
};

type Registration = {
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
  attendees: Array<{ id: number; name: string; role: string; checkedIn?: boolean; checkedInAt?: string | null }>;
  purchaseItem: PurchaseItem | null; // For backward compatibility
  purchaseItems?: PurchaseItem[]; // Array of purchase items (for multiple selection)
};

type RegistrationDetailProps = {
  registration: Registration;
  currentIndex: number;
  totalCount: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStatusUpdate: (status: "confirmed") => Promise<void>;
  onCheckIn: (attendeeId: number) => Promise<void>;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = date.getHours() >= 12 ? "PM" : "AM";
  const displayHour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours() === 0 ? 12 : date.getHours();
  
  return `${year}年${month}月${day}日 ${displayHour}:${minutes} ${period}`;
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    Leader: "bg-green-100 text-green-700",
    Follower: "bg-gray-100 text-gray-700",
    "Not sure": "bg-blue-100 text-blue-700",
  };
  return styles[role] || styles["Not sure"];
}

export function RegistrationDetail({
  registration,
  currentIndex,
  totalCount,
  onBack,
  onPrevious,
  onNext,
  onStatusUpdate,
  onCheckIn,
}: RegistrationDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
            <Cloud className="w-3 h-3" />
            <span>
              {registration.paymentStatus === "pending"
                ? "尚未付款"
                : registration.paymentStatus === "reported"
                  ? "待確認"
                  : registration.paymentStatus === "confirmed"
                    ? "已完成"
                    : "已拒絕"}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">{formatDate(registration.createdAt)}</div>
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
            <span className="ml-2 text-gray-900">{registration.contactPhone}</span>
          </div>
          <div>
            <span className="text-gray-500">信箱</span>
            <span className="ml-2 text-gray-900">{registration.contactEmail}</span>
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
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(attendee.role)}`}
                >
                  {attendee.role}
                </span>
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
          <div className="flex justify-between">
            <span className="text-gray-500">總金額</span>
            <span className="text-gray-900 font-semibold">
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
              {registration.paymentMethod || "未指定"}
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
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <Image
              src={registration.paymentScreenshotUrl}
              alt="付款截圖"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {showConfirmButton && (
        <Button
          onClick={handleConfirm}
          disabled={updating}
          className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
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
    </div>
  );
}
