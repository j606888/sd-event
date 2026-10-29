"use client";

import { ChevronLeft, Copy, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PublicLanguageBar } from "@/components/layout/PublicLanguageBar";
import { formatEventDateShort } from "@/lib/format-event-date";
import type { PublicEventData } from "@/types/event";
import type { EventPurchaseItem } from "@/types/event";
import type { FormData } from "../event-application-types";
import { LinePayeeCard } from "../LinePayeeCard";

const PAYMENT_METHODS = ["Line Pay", "Bank Transfer", "Other"] as const;

/** 付款方式的值是存進 DB 的資料，不能翻；只翻顯示的文字 */
const PAYMENT_METHOD_LABEL_KEYS = {
  "Line Pay": "linePay",
  "Bank Transfer": "bankTransfer",
  Other: "other",
} as const satisfies Record<(typeof PAYMENT_METHODS)[number], string>;

type PaymentStepProps = {
  event: PublicEventData;
  formData: FormData;
  selectedPlan: EventPurchaseItem | null;
  selectedPlans: EventPurchaseItem[];
  discountAmount: number;
  finalAmount: number;
  copiedText: string | null;
  onCopy: (text: string, type: string) => void;
  onPaymentMethodChange: (method: "Line Pay" | "Bank Transfer" | "Other") => void;
  submitError: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export function PaymentStep({
  event,
  formData,
  selectedPlan,
  selectedPlans,
  discountAmount,
  finalAmount,
  copiedText,
  onCopy,
  onPaymentMethodChange,
  submitError,
  submitting,
  onBack,
  onSubmit,
}: PaymentStepProps) {
  const t = useTranslations("publicEvent.payment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  // 套票標示「/ N 人」；一般票只有名稱與單價（不含要翻的字）
  const planLabel = (plan: EventPurchaseItem) =>
    (plan.seatCount ?? 1) > 1
      ? t("summary.planWithSeats", {
          name: plan.name,
          amount: String(plan.amount),
          seats: String(plan.seatCount),
        })
      : `${plan.name} $${plan.amount}`;
  // 活動沒指定 LINE 付款好友時不提供 Line Pay，避免參加者選了卻不知道要轉給誰
  const paymentMethods = PAYMENT_METHODS.filter(
    (method) => method !== "Line Pay" || event.linePayee
  );

  return (
    <div className="min-h-screen bg-paper p-4 sm:py-10">
      <PublicLanguageBar />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">

        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 font-display text-lg font-semibold text-ink">
            {t("title")}
          </h1>
        </div>

        <div className="px-4 py-6 space-y-6 bg-white">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-ink">{event.title}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500">{t("summary.time")}</span>
                <span className="text-gray-900">
                  {formatEventDateShort(event.startAt, event.endAt, locale)}
                </span>
              </div>
              {event.location && (
                <div className="flex gap-3">
                  <span className="text-gray-500">{t("summary.venue")}</span>
                  <span className="text-gray-900">{event.location.name}</span>
                </div>
              )}
              {event.allowMultiplePurchase || event.groups.length > 0 ? (
                selectedPlans.length > 0 && (
                  <div className="flex gap-3">
                    <span className="text-gray-500">{t("summary.tickets")}</span>
                    <span className="text-gray-900">
                      {selectedPlans.map((plan, i) => (
                        <span key={plan.id}>
                          {i < selectedPlans.length - 1 ? `${planLabel(plan)} + ` : planLabel(plan)}
                        </span>
                      ))}
                    </span>
                  </div>
                )
              ) : (
                selectedPlan && (
                  <div className="flex gap-3">
                    <span className="text-gray-500">{t("summary.tickets")}</span>
                    <span className="text-gray-900">{planLabel(selectedPlan)}</span>
                  </div>
                )
              )}
              <div className="flex gap-3">
                <span className="text-gray-500">{t("summary.contact")}</span>
                <span className="text-gray-900">
                  {formData.contactName} / {formData.contactPhone} /{" "}
                  {formData.contactEmail}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500">{t("summary.attendees")}</span>
                <span className="text-gray-900">
                  {formData.participants.map((p, i) => (
                    <span key={p.id}>
                      {p.name} ({p.role}
                      {event.attendeeFlagLabel && p.flagged && `・${event.attendeeFlagLabel}`})
                      {i < formData.participants.length - 1 && (
                        <span>{t("summary.attendeeSeparator")}</span>
                      )}
                    </span>
                  ))}
                </span>
              </div>
              {formData.appliedCoupon && discountAmount > 0 && (
                <div className="flex gap-3">
                  <span className="text-gray-500">{t("summary.coupon")}</span>
                  <span className="text-gray-900">
                    <span className="font-mono">{formData.appliedCoupon.code}</span>
                    <span className="ml-2 text-brand-strong">{`−NT$${discountAmount}`}</span>
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="text-gray-500">{t("summary.total")}</span>
                <span className="text-gray-900 font-semibold">
                  {formData.appliedCoupon && discountAmount > 0 ? (
                    <>
                      <span className="mr-2 font-normal text-gray-400 line-through">
                        {`$${formData.totalAmount}`}
                      </span>
                      <span>{`$${finalAmount}`}</span>
                    </>
                  ) : (
                    `$${formData.totalAmount}`
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">{t("methodHeading")}</h2>
            <p className="text-sm text-gray-600">{t("payRightAway")}</p>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <label
                  key={method}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={formData.paymentMethod === method}
                    onChange={() => onPaymentMethodChange(method)}
                    className="w-4 h-4 text-brand-strong border-gray-300 focus:ring-brand"
                  />
                  <span className="text-gray-900">
                    {t(`methods.${PAYMENT_METHOD_LABEL_KEYS[method]}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 匯款帳號只在選擇銀行轉帳時顯示，避免與其他付款方式混淆 */}
          {formData.paymentMethod === "Bank Transfer" && event.bankInfo && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">{t("bankHeading")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">{t("bank")}</span>
                    <span className="ml-2 text-gray-900">
                      {event.bankInfo.bankName} {event.bankInfo.bankCode}
                    </span>
                  </div>
                </div>
                {event.bankInfo.account && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-500">{t("account")}</span>
                      <span className="ml-2 text-gray-900">{event.bankInfo.account}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(event.bankInfo!.account!, "bank")}
                      className="h-8"
                    >
                      {copiedText === "bank" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === "bank" ? tCommon("copied") : t("copyAccount")}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.paymentMethod === "Line Pay" && event.linePayee && (
            <LinePayeeCard linePayee={event.linePayee} className="p-4 bg-gray-50 rounded-lg" />
          )}

          {submitError && (
            <div className="text-sm text-red-500 text-center">{submitError}</div>
          )}

          <Button
            onClick={onSubmit}
            disabled={!formData.paymentMethod || submitting}
            className="w-full bg-brand text-ink hover:bg-brand-hover h-12 text-base font-medium"
          >
            {submitting ? tCommon("processing") : t("submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}