"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { RegistrationSuccessPage } from "@/components/events/registration/RegistrationSuccessPage";
import type {
  RegistrationSuccessPageRouteData,
  RegistrationSuccessEventData,
  RegistrationSuccessRegistrationData,
} from "@/types/registration";

/** 錯誤存代碼、render 時才翻，切換語言時訊息才會跟著換 */
type LoadErrorCode = "invalidKey" | "notFound" | "loadFailed";

export default function RegistrationSuccessPageRoute() {
  const t = useTranslations("myRegistration.loadError");
  const tCommon = useTranslations("common");
  const params = useParams();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadErrorCode | null>(null);

  const [registrationData, setRegistrationData] = useState<RegistrationSuccessPageRouteData | null>(null);

  const fetchRegistrationData = useCallback(async () => {
    if (!registrationKey) {
      setError("invalidKey");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/registrations/${encodeURIComponent(registrationKey)}`);
      
      if (res.status === 404) {
        setError("notFound");
        setLoading(false);
        return;
      }
      
      if (!res.ok) throw new Error(`Failed to load registration: ${res.status}`);
      
      const data = await res.json();
      
      if (data?.registration && data?.event && data?.attendees) {
        // Transform API response to match component props
        setRegistrationData({
          event: {
            id: data.event.id,
            title: data.event.title,
            coverUrl: data.event.coverUrl,
            startAt: data.event.startAt,
            endAt: data.event.endAt,
            location: data.event.location,
            organizer: data.event.organizer,
            purchaseItems: data.purchaseItem
              ? [
                  {
                    id: data.purchaseItem.id,
                    name: data.purchaseItem.name,
                    amount: data.purchaseItem.amount,
                  },
                ]
              : [],
          },
          registration: {
            selectedPlan: data.purchaseItem
              ? {
                  id: data.purchaseItem.id,
                  name: data.purchaseItem.name,
                  amount: data.purchaseItem.amount,
                }
              : null,
            contactName: data.registration.contactName,
            contactPhone: data.registration.contactPhone,
            contactEmail: data.registration.contactEmail,
            participants: data.attendees.map((a: any) => ({
              name: a.name,
              role: a.role,
            })),
            totalAmount: String(data.registration.totalAmount),
            couponCode: data.registration.couponCode ?? null,
            discountAmount: data.registration.discountAmount ?? 0,
            paymentMethod: data.registration.paymentMethod,
            attendees: data.attendees.map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role,
              checkedIn: a.checkedIn || false,
            })),
            paymentStatus: data.registration.paymentStatus,
          } as RegistrationSuccessRegistrationData & {
            attendees: Array<{ id: number; name: string; role: string; checkedIn: boolean }>;
            paymentStatus?: string;
          },
          paymentStatus: data.registration.paymentStatus,
        });
      } else {
        setError("notFound");
      }
    } catch (err) {
      setError("loadFailed");
    } finally {
      setLoading(false);
    }
  }, [registrationKey]);

  useEffect(() => {
    fetchRegistrationData();
  }, [fetchRegistrationData]);

  // Auto-refresh every 10 seconds if status is "reported" (waiting for confirmation)
  useEffect(() => {
    if (!registrationData || registrationData.paymentStatus !== "reported") {
      return;
    }

    const interval = setInterval(() => {
      fetchRegistrationData();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [registrationData?.paymentStatus, fetchRegistrationData]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (error || !registrationData) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{t(error ?? "notFound")}</p>
        <p className="text-sm text-gray-500">{t("linkExpired")}</p>
      </div>
    );
  }

  return (
    <RegistrationSuccessPage
      event={registrationData.event}
      registration={{
        selectedPlan: registrationData.registration.selectedPlan,
        contactName: registrationData.registration.contactName,
        contactPhone: registrationData.registration.contactPhone,
        contactEmail: registrationData.registration.contactEmail,
        participants: registrationData.registration.participants,
        totalAmount: registrationData.registration.totalAmount,
        couponCode: registrationData.registration.couponCode ?? null,
        discountAmount: registrationData.registration.discountAmount ?? 0,
        paymentMethod: registrationData.registration.paymentMethod,
      }}
      registrationKey={registrationKey}
      paymentStatus={registrationData.paymentStatus}
    />
  );
}
