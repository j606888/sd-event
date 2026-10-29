"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function RejectedPaymentHeader() {
  const t = useTranslations("myRegistration.headers.rejected");
  return (
    <div className="bg-red-50 px-4 py-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h1>
      <p className="text-sm text-gray-600 mb-1">{t("couldNotVerify")}</p>
      <p className="text-sm text-gray-600 mb-4">
        {t("reportAgain")}
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full text-sm text-red-800">
        <AlertCircle className="w-4 h-4" />
        <span>{t("title")}</span>
      </div>
    </div>
  );
}
