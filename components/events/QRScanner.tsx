"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannedRegistrationDetail } from "./ScannedRegistrationDetail";

type RegistrationData = {
  id: number;
  registrationKey: string;
  contactName: string;
  totalAmount: number;
  paymentStatus: string;
  purchaseItem: { id: number; name: string; amount: number } | null;
  attendees: Array<{
    id: number;
    name: string;
    role: string;
    checkedIn: boolean;
    checkedInAt: string | null;
  }>;
};

type QRScannerProps = {
  eventId: number;
  onScanSuccess?: (attendeeId: number, attendeeName: string) => void;
  onClose: () => void;
};

export function QRScanner({ eventId, onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedRegistration, setScannedRegistration] = useState<RegistrationData | null>(null);
  const processingRef = useRef(false);

  const parseQRCode = (decodedText: string): string | null => {
    try {
      const data = JSON.parse(decodedText);
      if (data.registrationKey && typeof data.registrationKey === "string") {
        return data.registrationKey;
      }
    } catch (e) {
      // Try parsing as direct registration key (if it's just a string)
      if (typeof decodedText === "string" && decodedText.length > 0) {
        return decodedText;
      }
    }
    return null;
  };

  const fetchRegistrationData = async (registrationKey: string) => {
    try {
      const res = await fetch(`/api/registrations/${encodeURIComponent(registrationKey)}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("無法載入報名資料");
      }

      const data = await res.json().catch(() => ({}));

      if (data?.registration && data?.attendees && data?.event) {
        // Verify this registration belongs to the current event
        if (data.registration.eventId !== eventId) {
          setError("此 QR code 不屬於當前活動");
          setTimeout(() => setError(null), 3000);
          return;
        }

        // Stop scanning and show registration details
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            setScanning(false);
          } catch (e) {
            // Ignore stop errors
          }
        }

        setScannedRegistration({
          id: data.registration.id,
          registrationKey: data.registration.registrationKey,
          contactName: data.registration.contactName,
          totalAmount: data.registration.totalAmount,
          paymentStatus: data.registration.paymentStatus,
          purchaseItem: data.purchaseItem
            ? {
                id: data.purchaseItem.id,
                name: data.purchaseItem.name,
                amount: data.purchaseItem.amount,
              }
            : null,
          attendees: data.attendees.map((a: any) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            checkedIn: a.checkedIn || false,
            checkedInAt: a.checkedInAt,
          })),
        });
      } else {
        throw new Error("無效的報名資料");
      }
    } catch (err) {
      console.error("Failed to fetch registration:", err);
      setError("無法載入報名資料");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCheckIn = async (attendeeId: number) => {
    try {
      const res = await fetch(`/api/attendees/${attendeeId}/check-in`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "檢查入場失敗");
      }

      // Get updated attendee data
      const attendeeRes = await fetch(`/api/attendees/${attendeeId}/check-in`, {
        credentials: "include",
      });
      const attendeeData = await attendeeRes.json().catch(() => ({}));

      const attendeeName = attendeeData.attendee?.name || "參加者";

      // Update local registration data
      if (scannedRegistration) {
        setScannedRegistration((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attendees: prev.attendees.map((a) =>
              a.id === attendeeId
                ? {
                    ...a,
                    checkedIn: true,
                    checkedInAt: new Date().toISOString(),
                  }
                : a
            ),
          };
        });
      }

      onScanSuccess?.(attendeeId, attendeeName);
    } catch (err) {
      console.error("Check-in error:", err);
      throw err;
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current) {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
      } catch (err) {
        console.error("Failed to create scanner:", err);
        return;
      }
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          const registrationKey = parseQRCode(decodedText);
          if (registrationKey) {
            fetchRegistrationData(registrationKey);
          } else {
            setError("無效的 QR code");
            setTimeout(() => setError(null), 2000);
          }
        },
        (_errorMessage: string) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );
      setScanning(true);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setError("無法啟動相機，請確認已授予相機權限");
    }
  };

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      if (mounted) {
        await startScanning();
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(() => {
            scannerRef.current = null;
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToScanner = () => {
    setScannedRegistration(null);
    setError(null);
    startScanning();
  };

  // Show registration detail if scanned
  if (scannedRegistration) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">掃描 QR Code</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Registration Detail */}
          <div className="p-4">
            <ScannedRegistrationDetail
              registration={scannedRegistration}
              onBack={handleBackToScanner}
              onCheckIn={handleCheckIn}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">掃描 QR Code</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: "300px" }}
          />

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {scanning && !error && (
            <p className="mt-4 text-center text-sm text-gray-500">
              請將 QR code 對準相機
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            關閉
          </Button>
        </div>
      </div>
    </div>
  );
}
