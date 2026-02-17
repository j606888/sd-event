"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Wallet, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";
import { siInstagram, siLine, siFacebook } from "simple-icons";
import { PendingPaymentHeader } from "./headers/PendingPaymentHeader";
import { ReportedPaymentHeader } from "./headers/ReportedPaymentHeader";
import { ConfirmedPaymentHeader } from "./headers/ConfirmedPaymentHeader";
import { RejectedPaymentHeader } from "./headers/RejectedPaymentHeader";
import type { RegistrationSuccessPageProps } from "@/types/registration";

export function RegistrationSuccessPage({
  event,
  registration,
  registrationKey,
  paymentStatus,
}: RegistrationSuccessPageProps) {
  const participantsText = registration.participants.map((p) => p.name).join("、");

  const renderHeader = () => {
    switch (paymentStatus) {
      case "confirmed":
        return <ConfirmedPaymentHeader />;
      case "reported":
        return <ReportedPaymentHeader />;
      case "rejected":
        return <RejectedPaymentHeader />;
      default:
        return <PendingPaymentHeader />;
    }
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

        {/* Payment Section or Entry Voucher Button */}
        {paymentStatus === "confirmed" ? (
          <div className="px-4 py-6 bg-white border-t border-gray-200">
            <Button
              asChild
              className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
            >
              <Link href={`/entry-voucher/${registrationKey}`}>
                開啟入場憑證
              </Link>
            </Button>
          </div>
        ) : (
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
        )}

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
