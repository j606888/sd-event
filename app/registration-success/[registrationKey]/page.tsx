"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RegistrationSuccessPage } from "@/components/events/RegistrationSuccessPage";
import { ConfirmedPage } from "@/components/events/ConfirmedPage";

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

type Attendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
};

type RegistrationData = {
  selectedPlan: PurchaseItem | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  participants: Array<{ name: string; role: string }>;
  totalAmount: string;
  paymentMethod: string | null;
  attendees?: Attendee[];
  paymentStatus?: string;
};

export default function RegistrationSuccessPageRoute() {
  const params = useParams();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For now, we'll use sessionStorage to get the registration data
  // In a real app, this would fetch from an API using the registrationKey
  const [registrationData, setRegistrationData] = useState<{
    event: EventData;
    registration: RegistrationData;
  } | null>(null);

  useEffect(() => {
    if (!registrationKey) {
      setError("無效的報名編號");
      setLoading(false);
      return;
    }

    // Fetch registration data from API
    fetch(`/api/registrations/${encodeURIComponent(registrationKey)}`)
      .then((res) => {
        if (res.status === 404) {
          setError("找不到報名資料");
          return null;
        }
        if (!res.ok) throw new Error("無法載入");
        return res.json();
      })
      .then((data) => {
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
              paymentMethod: data.registration.paymentMethod,
              attendees: data.attendees.map((a: any) => ({
                id: a.id,
                name: a.name,
                role: a.role,
                checkedIn: a.checkedIn || false,
              })),
              paymentStatus: data.registration.paymentStatus,
            },
          });
        } else {
          setError("找不到報名資料");
        }
      })
      .catch(() => setError("無法載入報名資料"))
      .finally(() => setLoading(false));
  }, [registrationKey]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error || !registrationData) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "找不到報名資料"}</p>
        <p className="text-sm text-gray-500">連結可能已失效</p>
      </div>
    );
  }

  // Show confirmed page if payment status is confirmed
  if (registrationData.registration.paymentStatus === "confirmed") {
    return (
      <ConfirmedPage
        event={registrationData.event}
        registration={registrationData.registration}
        registrationKey={registrationKey}
      />
    );
  }

  return (
    <RegistrationSuccessPage
      event={registrationData.event}
      registration={registrationData.registration}
      registrationKey={registrationKey}
    />
  );
}
