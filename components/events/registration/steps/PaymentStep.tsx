"use client";

import { ChevronLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEventDateShort } from "@/lib/format-event-date";
import type { PublicEventData } from "@/types/event";
import type { EventPurchaseItem } from "@/types/event";
import type { FormData } from "../event-application-types";

const PAYMENT_METHODS = ["Line Pay", "Bank Transfer", "Other"] as const;

type PaymentStepProps = {
  event: PublicEventData;
  formData: FormData;
  selectedPlan: EventPurchaseItem | null;
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
  copiedText,
  onCopy,
  onPaymentMethodChange,
  submitError,
  submitting,
  onBack,
  onSubmit,
}: PaymentStepProps) {
  return (
    <div className="min-h-screen ">
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">
          選擇付款方式
        </h1>
      </div>

      <div className="px-4 py-6 space-y-6 bg-white">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-500">時間</span>
              <span className="text-gray-900">
                {formatEventDateShort(event.startAt, event.endAt)}
              </span>
            </div>
            {event.location && (
              <div className="flex gap-3">
                <span className="text-gray-500">地點</span>
                <span className="text-gray-900">{event.location.name}</span>
              </div>
            )}
            {selectedPlan && (
              <div className="flex gap-3">
                <span className="text-gray-500">選擇方案</span>
                <span className="text-gray-900">
                  {selectedPlan.name} ${selectedPlan.amount}
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-gray-500">聯絡人</span>
              <span className="text-gray-900">
                {formData.contactName} / {formData.contactPhone} /{" "}
                {formData.contactEmail}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">參加者</span>
              <span className="text-gray-900">
                {formData.participants.map((p, i) => (
                  <span key={p.id}>
                    {p.name} ({p.role})
                    {i < formData.participants.length - 1 && "、"}
                  </span>
                ))}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">總金額</span>
              <span className="text-gray-900 font-semibold">
                ${formData.totalAmount}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">付款方式</h2>
          <p className="text-sm text-gray-600">請於確認報名後立即付款</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={formData.paymentMethod === method}
                  onChange={() => onPaymentMethodChange(method)}
                  className="w-4 h-4 text-[#5295BC] border-gray-300 focus:ring-[#5295BC]"
                />
                <span className="text-gray-900">{method}</span>
              </label>
            ))}
          </div>
        </div>

        {event.bankInfo && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">匯款帳號</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-500">銀行</span>
                  <span className="ml-2 text-gray-900">
                    {event.bankInfo.bankName} {event.bankInfo.bankCode}
                  </span>
                </div>
              </div>
              {event.bankInfo.account && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">帳號</span>
                    <span className="ml-2 text-gray-900">{event.bankInfo.account}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(event.bankInfo!.account!, "bank")}
                    className="h-8"
                  >
                    {copiedText === "bank" ? (
                      <>
                        <Check className="w-3 h-3" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        複製帳號
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {event.organizer?.lineId && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">Line 好友</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">LINE ID</span>
                <span className="ml-2 text-sm text-gray-900">{event.organizer.lineId}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(event.organizer!.lineId!, "line")}
                className="h-8"
              >
                {copiedText === "line" ? (
                  <>
                    <Check className="w-3 h-3" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    複製 ID
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {submitError && (
          <div className="text-sm text-red-500 text-center">{submitError}</div>
        )}

        <Button
          onClick={onSubmit}
          disabled={!formData.paymentMethod || submitting}
          className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
        >
          {submitting ? "處理中…" : "確認報名"}
        </Button>
      </div>
    </div>
  );
}