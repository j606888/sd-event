"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { QRScanner } from "@/components/events/registration/QRScanner";
import { WalkInDrawer } from "@/components/events/management/WalkInDrawer";
import { useReadOnly } from "@/hooks/use-session";

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const readOnly = useReadOnly();
  const eventId = Number(params?.eventId);
  const [showScanner, setShowScanner] = useState(true);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const handleScanSuccess = (attendeeId: number, attendeeName: string) => {
    // Scanner will show success message
    // The scanner component handles the UI feedback
    console.log(`Checked in: ${attendeeName} (ID: ${attendeeId})`);
  };

  const handleClose = () => {
    router.back();
  };

  if (!Number.isInteger(eventId)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-red-500">無效的活動 ID</p>
      </div>
    );
  }

  // 掃碼報到必然寫入資料，模擬檢視中直接停用
  if (readOnly) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-3 text-center">
        <p className="font-semibold text-gray-900">模擬檢視為唯讀模式</p>
        <p className="text-sm text-gray-500">無法使用掃碼報到功能</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <>
      {showScanner && (
        <QRScanner
          eventId={eventId}
          onScanSuccess={handleScanSuccess}
          onClose={handleClose}
          onWalkIn={() => setWalkInOpen(true)}
        />
      )}
      <WalkInDrawer
        open={walkInOpen}
        eventId={eventId}
        onClose={() => setWalkInOpen(false)}
      />
    </>
  );
}
