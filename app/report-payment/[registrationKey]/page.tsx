"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportPaymentPage } from "@/components/events/registration/ReportPaymentPage";
import type { EventLinePayee } from "@/types/event";

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

export default function ReportPaymentPageRoute() {
  const params = useParams();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    bankInfo: BankInfo | null;
    linePayee: EventLinePayee | null;
  } | null>(null);

  useEffect(() => {
    if (!registrationKey) return;

    // Fetch registration data to get bank info and LINE payee
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
            linePayee: responseData.event.linePayee ?? null,
          });
        } else {
          setError("找不到報名資料");
        }
      })
      .catch(() => setError("無法載入報名資料"))
      .finally(() => setLoading(false));
  }, [registrationKey]);

  if (loading && registrationKey) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <p className="text-muted-ink">載入中…</p>
      </div>
    );
  }

  if (!registrationKey || error || !data) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl text-center space-y-2">
          <p className="text-red-500">
            {(!registrationKey ? "無效的報名編號" : error) ?? "找不到報名資料"}
          </p>
          <p className="text-sm text-gray-500">連結可能已失效</p>
        </div>
      </div>
    );
  }

  return (
    <ReportPaymentPage
      registrationKey={registrationKey}
      bankInfo={data.bankInfo}
      linePayee={data.linePayee}
    />
  );
}
