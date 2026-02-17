"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Clock, MapPin, Wallet, Users, DollarSign, Cloud, AlertCircle, Rat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { useEffect } from "react";
import { getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";
import { siInstagram, siLine, siFacebook } from "simple-icons";

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
      <div className="text-center p-4">
        <div
          className="px-4 py-4 rounded-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(82, 149, 188, 0.5) 0%, rgba(82, 149, 188, 0.1) 100%)",
          }}
        >
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 rounded-full bg-[#5295BC]/30 flex items-center justify-center">
              <div className="w-15 h-15 rounded-full bg-[#5295BC] flex items-center justify-center">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>
          <h1 className="text-[20px] font-bold text-gray-900 mb-1">報名成功!</h1>
          <p className="text-[15px] text-gray-600">目前尚未完成付款</p>
          <p className="text-[15px] text-gray-600 mb-3">
            請於期限內完成付款以保留名額
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 rounded-full text-sm text-white">
            <Rat className="w-4 h-4" />
            <span>尚未付款</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="">
      <div className="mx-auto max-w-lg">
        {renderHeader()}

        <div className="px-4 space-y-4 pb-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Clock className="w-6 h-6 text-gray-500 " />
              <div>
                <div className="text-gray-900 text-[15px]">
                  {getEventDateLabel(event.startAt, event.endAt)}
                </div>
                <div className="text-gray-900 text-[15px]">
                  {getEventTimeRange(event.startAt, event.endAt)}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-4">
                <MapPin className="w-6 h-6 text-gray-500 " />
                <div className="flex-1">
                  <div className="text-gray-900">{event.location.name}</div>
                  {event.location.address && (
                    <div className="text-gray-500 text-[15px]">
                      {event.location.address}
                    </div>
                  )}
                </div>
                {event.location.googleMapUrl && (
                    <a
                      href={event.location.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#5295BC] mt-1 inline-block"
                    >
                      導航&gt;
                    </a>
                  )}
              </div>
            )}

            {/* Selected Plan */}
            {registration.selectedPlan && (
              <div className="flex items-center gap-4">
                <Wallet className="w-6 h-6 text-gray-500 " />
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
              <div className="flex items-center gap-4">
                <Users className="w-6 h-6 text-gray-500 " />
                <div>
                  <div className="text-sm text-gray-500">參加者</div>
                  <div className="text-gray-900">{participantsText}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-gray-500" />
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
                      <SimpleIcon icon={siInstagram} size={20} />
                    </a>
                  )}
                  {event.organizer.lineId && (
                    <a
                      href={`https://line.me/ti/p/${event.organizer.lineId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <SimpleIcon icon={siLine} size={20} />
                    </a>
                  )}
                  {event.organizer.facebook && (
                    <a
                      href={event.organizer.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <SimpleIcon icon={siFacebook} size={20} />
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
