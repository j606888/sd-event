"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Attendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
  checkedInAt: string | null;
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
  totalAmount: number;
  paymentStatus: string;
  purchaseItem: PurchaseItem | null;
  attendees: Attendee[];
};

type ScannedRegistrationDetailProps = {
  registration: Registration;
  onBack: () => void;
  onCheckIn: (attendeeId: number) => Promise<void>;
  backLabel?: string;
};

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    Leader: "bg-green-100 text-green-700",
    Follower: "bg-gray-100 text-gray-700",
    "Not sure": "bg-blue-100 text-blue-700",
  };
  return styles[role] || styles["Not sure"];
}

export function ScannedRegistrationDetail({
  registration,
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
              {attendeeCount}人 · NT ${registration.totalAmount.toLocaleString()}
            </div>
          </div>
          {allCheckedIn && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              <span>已完成</span>
            </div>
          )}
        </div>
      </div>

      {/* Registration Item */}
      {registration.purchaseItem && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">報名項目</h3>
          <div className="text-sm text-gray-900">
            {registration.purchaseItem.name}
          </div>
        </div>
      )}

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
                <Button
                  onClick={() => handleCheckIn(attendee.id)}
                  disabled={checkingIn === attendee.id}
                  size="sm"
                  className="bg-[#5295BC] text-white hover:bg-[#4285A5] h-8 px-3 text-xs"
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
