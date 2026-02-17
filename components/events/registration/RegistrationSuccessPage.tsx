"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, Wallet, Users, DollarSign, Cloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

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

type Location = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

type Organizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
};

type PurchaseItem = {
  id: number;
  name: string;
  amount: number;
};

type EventData = {
  id: number;
  title: string;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  location: Location | null;
  organizer: Organizer | null;
  purchaseItems: PurchaseItem[];
};

type RegistrationData = {
  selectedPlan: PurchaseItem | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  participants: Array<{ name: string; role: string }>;
  totalAmount: string;
  paymentMethod: string | null;
};

type RegistrationSuccessPageProps = {
  event: EventData;
  registration: RegistrationData;
  registrationKey: string;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
};

export function RegistrationSuccessPage({
  event,
  registration,
  registrationKey,
  paymentStatus,
}: RegistrationSuccessPageProps) {
  const participantsText = registration.participants.map((p) => p.name).join("、");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Render different header based on payment status
  const renderHeader = () => {
    if (paymentStatus === "reported") {
      return (
        <div className="bg-yellow-50 px-4 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center">
              <Clock className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">付款資訊已回報</h1>
          <p className="text-sm text-gray-600 mb-1">我們已收到您回報的付款資訊</p>
          <p className="text-sm text-gray-600 mb-4">
            主辦方將盡快為您確認，請稍候
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full text-sm text-yellow-800">
            <Clock className="w-4 h-4" />
            <span>待主辦方確認</span>
          </div>
        </div>
      );
    }

    if (paymentStatus === "rejected") {
      return (
        <div className="bg-red-50 px-4 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">付款確認失敗</h1>
          <p className="text-sm text-gray-600 mb-1">主辦方無法確認您的付款資訊</p>
          <p className="text-sm text-gray-600 mb-4">
            請重新回報付款資訊或聯繫主辦單位
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full text-sm text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span>付款確認失敗</span>
          </div>
        </div>
      );
    }

    // Default: pending
    return (
      <div className="bg-blue-50 px-4 py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#5295BC] flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">報名成功!</h1>
        <p className="text-sm text-gray-600 mb-1">目前尚未完成付款</p>
        <p className="text-sm text-gray-600 mb-4">
          請於期限內完成付款以保留名額
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
          <Cloud className="w-4 h-4" />
          <span>尚未付款</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg">
        {/* Success Header */}
        {renderHeader()}

        {/* Event Details */}
        <div className="px-4 py-6 space-y-4 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>

          <div className="space-y-3">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-gray-900">
                  {formatEventDate(event.startAt, event.endAt)}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-gray-900">{event.location.name}</div>
                  {event.location.address && (
                    <div className="text-sm text-gray-600 mt-1">
                      {event.location.address}
                    </div>
                  )}
                  {event.location.googleMapUrl && (
                    <a
                      href={event.location.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#5295BC] mt-1 inline-block"
                    >
                      導航 &gt;
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Selected Plan */}
            {registration.selectedPlan && (
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">選擇方案</div>
                  <div className="text-gray-900">
                    {registration.selectedPlan.name} ${registration.selectedPlan.amount}
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            {registration.participants.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-gray-500">參加者</div>
                  <div className="text-gray-900">{participantsText}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="px-4 py-6 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <span className="text-gray-900">應付金額</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              NT {registration.totalAmount}
            </span>
          </div>
          {(paymentStatus === "pending" || paymentStatus === "rejected") && (
            <Button
              asChild
              className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
            >
              <Link href={`/report-payment/${registrationKey}`}>
                {paymentStatus === "rejected" ? "重新回報付款資訊" : "回報付款資訊"}
              </Link>
            </Button>
          )}
          {paymentStatus === "reported" && (
            <div className="text-center text-sm text-gray-600">
              付款資訊已送出，請等待主辦方確認
            </div>
          )}
        </div>

        {/* Organizer Section */}
        {event.organizer && (
          <div className="px-4 py-6 bg-white border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">主辦單位</h3>
            <div className="flex items-center gap-3">
              {event.organizer.photoUrl && (
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={event.organizer.photoUrl}
                    alt={event.organizer.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{event.organizer.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  {event.organizer.instagram && (
                    <a
                      href={event.organizer.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  )}
                  {event.organizer.lineId && (
                    <a
                      href={`https://line.me/ti/p/${event.organizer.lineId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.058 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                    </a>
                  )}
                  {event.organizer.facebook && (
                    <a
                      href={event.organizer.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
