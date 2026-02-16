"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportPaymentPage } from "@/components/events/ReportPaymentPage";

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type Organizer = {
  id: number;
  name: string;
  lineId: string | null;
};

export default function ReportPaymentPageRoute() {
  const params = useParams();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    bankInfo: BankInfo | null;
    organizer: Organizer | null;
  } | null>(null);

  useEffect(() => {
    if (!registrationKey) {
      setError("無效的報名編號");
      setLoading(false);
      return;
    }

    // Fetch registration data to get bank info and organizer
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
        if (responseData?.event) {
          setData({
            bankInfo: responseData.event.bankInfo,
            organizer: responseData.event.organizer,
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

  if (error || !data) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "找不到報名資料"}</p>
        <p className="text-sm text-gray-500">連結可能已失效</p>
      </div>
    );
  }

  return (
    <ReportPaymentPage
      registrationKey={registrationKey}
      bankInfo={data.bankInfo}
      organizer={data.organizer}
    />
  );
}
