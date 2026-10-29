"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConfirmedPaymentHeader() {
  const t = useTranslations("myRegistration.headers.confirmed");
  return (
    <div className="p-4 text-center">
      <div
        className="px-6 py-8 rounded-2xl border border-brand/40 shadow-sm"
        style={{
          background:
            "linear-gradient(180deg, var(--brand-soft) 0%, #FFFFFF 100%)", // 極淺的霧藍到純白漸層
        }}
      >
        {/* 圖示區域：核心品牌藍 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* 外圈光暈 */}
            <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center">
              {/* 核心圓圈 */}
              <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center">
                <Check className="w-8 h-8 text-ink stroke-3" />
              </div>
            </div>
          </div>
        </div>

        {/* 文字區域 */}
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
          {t("title")}
        </h1>

        <div className="space-y-1 mb-6">
          <p className="text-[15px] font-medium text-slate-600">
            {t("received")}
          </p>
          <p className="text-[14px] text-slate-400">
            {t("showPass")}
          </p>
        </div>

        {/* 狀態 Tag：使用品牌藍實心色塊（霧藍底配深色字） */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand">
          <Check className="w-3.5 h-3.5 text-ink" strokeWidth={3} />
          <span className="text-sm font-bold text-ink">{t("badge")}</span>
        </div>
      </div>
    </div>
  );
}
