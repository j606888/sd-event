"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ReportPaymentPage } from "@/components/events/registration/ReportPaymentPage";
import type { EventLinePayee } from "@/types/event";

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

/** 錯誤存代碼、render 時才翻，切換語言時訊息才會跟著換 */
type LoadErrorCode = "notFound" | "loadFailed";

export default function ReportPaymentPageRoute() {
  const t = useTranslations("myRegistration.loadError");
  const tCommon = useTranslations("common");
  const params = useParams();
  const registrationKey = params?.registrationKey as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadErrorCode | null>(null);
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
          setError("notFound");
          return null;
        }
        if (!res.ok) throw new Error(`Failed to load registration: ${res.status}`);
        return res.json();
      })
      .then((responseData) => {
        if (responseData?.event) {
          setData({
            bankInfo: responseData.event.bankInfo,
            linePayee: responseData.event.linePayee ?? null,
          });
        } else {
          setError("notFound");
        }
      })
      .catch(() => setError("loadFailed"))
      .finally(() => setLoading(false));
  }, [registrationKey]);

  if (loading && registrationKey) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <p className="text-muted-ink">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!registrationKey || error || !data) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl text-center space-y-2">
          <p className="text-red-500">
            {t((!registrationKey ? "invalidKey" : error) ?? "notFound")}
          </p>
          <p className="text-sm text-gray-500">{t("linkExpired")}</p>
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
