"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Clock, MapPin, Wallet, DollarSign, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";
import { useLocale, useTranslations } from "next-intl";
import { PublicLanguageBar } from "@/components/layout/PublicLanguageBar";
import { getRegistrationByKey } from "@/lib/api/registration";
import { formatEventDateShort } from "@/lib/format-event-date";
import type { EntryVoucherPageData } from "@/types/registration";

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    Leader: "bg-leader text-white",
    Follower: "bg-follower-soft text-follower",
    "Not sure": "bg-field text-muted-ink",
  };
  return styles[role] || styles["Not sure"];
}

/** DB 的舞蹈角色 → enums.role 的 key；不認得的角色直接顯示原值 */
const ROLE_LABEL_KEY: Record<string, "Leader" | "Follower" | "notSure"> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "notSure",
};

/** 錯誤存代碼、render 時才翻，切換語言時訊息才會跟著換 */
type LoadErrorCode = "notFound" | "refunded" | "qrFailed" | "loadFailed";

export default function EntryVoucherPage() {
  const t = useTranslations("myRegistration.voucher");
  const tError = useTranslations("myRegistration.loadError");
  const tRole = useTranslations("enums.role");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadErrorCode | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [data, setData] = useState<EntryVoucherPageData | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!registrationKey) return;

    const transformApiData = (responseData: Awaited<ReturnType<typeof getRegistrationByKey>>) => {
      if (!responseData?.registration || !responseData?.event || !responseData?.attendees) {
        return null;
      }

      return {
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
          couponCode: responseData.registration.couponCode ?? null,
          discountAmount: responseData.registration.discountAmount ?? 0,
          attendees: responseData.attendees.map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            checkedIn: a.checkedIn || false,
          })),
        },
      };
    };

    const fetchData = async (isPolling = false) => {
      try {
        // Only set loading on initial load
        if (!isPolling) {
          setLoading(true);
        }

        const responseData = await getRegistrationByKey(registrationKey);

        if (!responseData) {
          if (!isPolling) {
            setError("notFound");
            setLoading(false);
          }
          return;
        }

        // 已退款的報名憑證失效，不產生 QR code
        if (responseData.registration.paymentStatus === "refunded") {
          setError("refunded");
          setLoading(false);
          return;
        }

        const transformedData = transformApiData(responseData);
        if (!transformedData) {
          if (!isPolling) {
            setError("notFound");
            setLoading(false);
          }
          return;
        }

        // Generate QR code only on initial load
        if (isInitialLoad.current) {
          const qrData = JSON.stringify({
            registrationKey,
            attendeeIds: responseData.attendees.map((a) => a.id),
          });

          try {
            const url = await QRCode.toDataURL(qrData, {
              width: 300,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
            setQrCodeUrl(url);
          } catch (err) {
            console.error("QR code generation error:", err);
            if (!isPolling) {
              setError("qrFailed");
            }
          }
        }

        // Update data state (this will trigger re-render without full page refresh)
        setData(transformedData);

        if (!isPolling) {
          setLoading(false);
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error("Failed to fetch registration:", err);
        if (!isPolling) {
          setError("loadFailed");
          setLoading(false);
        }
      }
    };

    // Initial load
    fetchData(false);

    // Polling: refresh data every 5 seconds to update check-in status
    // Only updates data state, doesn't reset loading/error states
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [registrationKey]);

  if (loading && registrationKey) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <p className="text-muted-ink">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!registrationKey || error || !data || !qrCodeUrl) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl text-center space-y-2">
          <p className="text-red-500">
            {tError((!registrationKey ? "invalidKey" : error) ?? "notFound")}
          </p>
          <p className="text-sm text-gray-500">{tError("linkExpired")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-4 sm:py-10">
      <PublicLanguageBar />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/registration-success/${registrationKey}`)}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">{t("title")}</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64 bg-white p-4 rounded-lg border-2 border-gray-200">
            <Image
              src={qrCodeUrl}
              alt={t("qrAlt")}
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Attendees with Check-in Status */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">{t("attendees")}</h2>
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
                    {ROLE_LABEL_KEY[attendee.role] ? tRole(ROLE_LABEL_KEY[attendee.role]) : attendee.role}
                  </span>
                </div>
                {attendee.checkedIn ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t("checkedIn")}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">{t("notCheckedIn")}</span>
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
                {formatEventDateShort(data.event.startAt, data.event.endAt, locale)}
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
                      className="text-brand-strong mt-1 inline-block text-xs"
                    >
                      {t("directions")}
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
                  <div className="text-gray-500 text-xs">{t("ticket")}</div>
                  <div className="text-gray-900">
                    {`${data.registration.selectedPlan.name} $${data.registration.selectedPlan.amount}`}
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount */}
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-gray-500 text-xs">{t("amountDue")}</div>
                <div className="text-gray-900 font-semibold">
                  {(data.registration.discountAmount ?? 0) > 0 && (
                    <span className="mr-2 font-normal text-gray-400 line-through">
                      {`NT ${
                        Number(data.registration.totalAmount) +
                        (data.registration.discountAmount ?? 0)
                      }`}
                    </span>
                  )}
                  <span>{`NT ${data.registration.totalAmount}`}</span>
                  {data.registration.couponCode &&
                    (data.registration.discountAmount ?? 0) > 0 && (
                      <span className="ml-2 font-mono text-xs font-normal text-brand-strong">
                        {data.registration.couponCode}
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
