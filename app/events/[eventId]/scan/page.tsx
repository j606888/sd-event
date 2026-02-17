"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { QRScanner } from "@/components/events/registration/QRScanner";

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.eventId);
  const [showScanner, setShowScanner] = useState(true);

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

  return (
    <>
      {showScanner && (
        <QRScanner
          eventId={eventId}
          onScanSuccess={handleScanSuccess}
          onClose={handleClose}
        />
      )}
    </>
  );
}
