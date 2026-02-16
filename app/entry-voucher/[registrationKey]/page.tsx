"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Clock, MapPin, Wallet, Users, DollarSign, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function formatEventDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAY[d.getDay()]})`;
  const timeFmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    Leader: "bg-green-100 text-green-700",
    Follower: "bg-gray-100 text-gray-700",
    "Not sure": "bg-blue-100 text-blue-700",
  };
  return styles[role] || styles["Not sure"];
}

type Location = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

type PurchaseItem = {
  id: number;
  name: string;
  amount: number;
};

type Attendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
};

type EventData = {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  location: Location | null;
};

type RegistrationData = {
  selectedPlan: PurchaseItem | null;
  totalAmount: string;
  attendees: Attendee[];
};

export default function EntryVoucherPage() {
  const params = useParams();
  const router = useRouter();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [data, setData] = useState<{
    event: EventData;
    registration: RegistrationData;
  } | null>(null);

  useEffect(() => {
    if (!registrationKey) {
      setError("無效的報名編號");
      setLoading(false);
      return;
    }

    const fetchData = () => {
      setLoading(true);
      // Fetch registration data
      fetch(`/api/registrations/${encodeURIComponent(registrationKey)}`)
        .then((res) => {
          if (res.status === 404) {
            setError("找不到報名資料");
            return null;
          }
          if (!res.ok) throw new Error("無法載入");
          return res.json();
        })
        .then((responseData) => {
          if (responseData?.registration && responseData?.event && responseData?.attendees) {
            const registrationData = {
              event: {
                id: responseData.event.id,
                title: responseData.event.title,
                startAt: responseData.event.startAt,
                endAt: responseData.event.endAt,
                location: responseData.event.location,
              },
              registration: {
                selectedPlan: responseData.purchaseItem
                  ? {
                      id: responseData.purchaseItem.id,
                      name: responseData.purchaseItem.name,
                      amount: responseData.purchaseItem.amount,
                    }
                  : null,
                totalAmount: String(responseData.registration.totalAmount),
                attendees: responseData.attendees.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  role: a.role,
                  checkedIn: a.checkedIn || false,
                })),
              },
            };
            setData(registrationData);

            // Generate QR code with registration key and attendee IDs
            // The QR code contains all attendee IDs so creator can check in any of them
            const qrData = JSON.stringify({
              registrationKey,
              attendeeIds: responseData.attendees.map((a: any) => a.id),
            });

            QRCode.toDataURL(qrData, {
              width: 300,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            })
              .then((url) => setQrCodeUrl(url))
              .catch((err) => {
                console.error("QR code generation error:", err);
                setError("無法產生 QR code");
              });
          } else {
            setError("找不到報名資料");
          }
        })
        .catch(() => setError("無法載入報名資料"))
        .finally(() => setLoading(false));
    };

    fetchData();
    // Refresh data every 5 seconds to update check-in status
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [registrationKey]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error || !data || !qrCodeUrl) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "找不到報名資料"}</p>
        <p className="text-sm text-gray-500">連結可能已失效</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">入場憑證</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64 bg-white p-4 rounded-lg border-2 border-gray-200">
            <Image
              src={qrCodeUrl}
              alt="入場 QR Code"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Attendees with Check-in Status */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">參加者</h2>
          <div className="space-y-2">
            {data.registration.attendees.map((attendee) => (
              <div
                key={attendee.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 font-medium">{attendee.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(attendee.role)}`}
                  >
                    {attendee.role}
                  </span>
                </div>
                {attendee.checkedIn ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>入場成功</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">未入場</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{data.event.title}</h2>

          <div className="space-y-2 text-sm">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <span className="text-gray-900">
                {formatEventDate(data.event.startAt, data.event.endAt)}
              </span>
            </div>

            {/* Location */}
            {data.event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-gray-900">{data.event.location.name}</div>
                  {data.event.location.address && (
                    <div className="text-gray-600 mt-1">
                      {data.event.location.address}
                    </div>
                  )}
                  {data.event.location.googleMapUrl && (
                    <a
                      href={data.event.location.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5295BC] mt-1 inline-block text-xs"
                    >
                      導航 &gt;
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Selected Plan */}
            {data.registration.selectedPlan && (
              <div className="flex items-start gap-3">
                <Wallet className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">選擇方案</div>
                  <div className="text-gray-900">
                    {data.registration.selectedPlan.name} ${data.registration.selectedPlan.amount}
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount */}
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-gray-500 text-xs">應付金額</div>
                <div className="text-gray-900 font-semibold">
                  NT {data.registration.totalAmount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
