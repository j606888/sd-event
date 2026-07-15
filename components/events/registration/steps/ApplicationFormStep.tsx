"use client";

import { ChevronLeft, Trash2, Plus, TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicEventData } from "@/types/event";
import type { FormData, Participant } from "../event-application-types";
import { GroupTicketPicker } from "../GroupTicketPicker";

const ROLES = ["Leader", "Follower", "Not sure"] as const;
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "還不確定",
};

type ApplicationFormStepProps = {
  event: PublicEventData;
  formData: FormData;
  onFormFieldChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (id: string, field: keyof Participant, value: string) => void;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  couponsSupported: boolean;
  applyingCoupon: boolean;
  couponError: string | null;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  discountAmount: number;
  finalAmount: number;
};

export function ApplicationFormStep({
  event,
  formData,
  onFormFieldChange,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  canProceed,
  onBack,
  onNext,
  couponsSupported,
  applyingCoupon,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  discountAmount,
  finalAmount,
}: ApplicationFormStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-[#2c5d7c] p-4 sm:py-10">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 font-display text-lg font-semibold text-ink">
            選擇方案 & 人數
          </h1>
        </div>

        <div className="px-4 py-6 space-y-6">

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">聯絡人資料</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="contactName">姓名</Label>
                <Input
                  id="contactName"
                  placeholder="請輸入姓名"
                  value={formData.contactName}
                  onChange={(e) => onFormFieldChange("contactName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">電話</Label>
                <Input
                  id="contactPhone"
                  placeholder="請輸入電話"
                  value={formData.contactPhone}
                  onChange={(e) => onFormFieldChange("contactPhone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">信箱</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="請輸入信箱"
                  value={formData.contactEmail}
                  onChange={(e) => onFormFieldChange("contactEmail", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <GroupTicketPicker
            groups={event.groups}
            purchaseItems={event.purchaseItems}
            allowMultiplePurchase={event.allowMultiplePurchase}
            activeTierName={event.activeTier?.name ?? null}
            selectedByGroup={formData.selectedByGroup}
            selectedPlanId={formData.selectedPlanId}
            selectedPlanIds={formData.selectedPlanIds}
            onSelectedByGroupChange={(next) =>
              onFormFieldChange("selectedByGroup", next)
            }
            onSelectedPlanChange={(planId, planIds) => {
              onFormFieldChange("selectedPlanId", planId);
              onFormFieldChange("selectedPlanIds", planIds);
            }}
          />


          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">參加者資料</h2>
            <div className="space-y-4">
              {formData.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 bg-brand text-white rounded text-sm font-medium">
                      參加者 {index + 1}
                    </div>
                    {formData.participants.length > 1 && (
                      <button
                        onClick={() => onRemoveParticipant(participant.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label>稱呼</Label>
                    <Input
                      placeholder="請輸入姓名"
                      value={participant.name}
                      onChange={(e) =>
                        onUpdateParticipant(participant.id, "name", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>角色</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ROLES.map((role) => {
                        const selected = participant.role === role;
                        const selectedClass =
                          role === "Leader"
                            ? "border-leader bg-leader/10 text-leader"
                            : role === "Follower"
                              ? "border-follower bg-follower/10 text-follower"
                              : "border-gray-400 bg-gray-100 text-gray-700";
                        return (
                          <button
                            type="button"
                            key={role}
                            onClick={() =>
                              onUpdateParticipant(participant.id, "role", role)
                            }
                            aria-pressed={selected}
                            className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? selectedClass
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {ROLE_LABELS[role]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={onAddParticipant}
              variant="outline"
              className="w-full border-brand text-brand hover:bg-brand/10"
            >
              <Plus className="w-4 h-4" />
              增加參加者
            </Button>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">費用</h2>
            <div>
              <Label htmlFor="totalAmount">
                {event.autoCalcAmount || event.groups.length > 0
                  ? "總金額（自動計算）"
                  : "總金額（請自行計算）"}
              </Label>
              <Input
                id="totalAmount"
                placeholder="請輸入總金額"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => onFormFieldChange("totalAmount", e.target.value)}
                disabled={event.autoCalcAmount || event.groups.length > 0}
                className="mt-1"
              />
            </div>

            {couponsSupported && (
              <div>
                <Label htmlFor="couponCode">折扣碼</Label>
                {formData.appliedCoupon ? (
                  <div className="mt-1 flex items-center justify-between rounded-lg border border-brand bg-brand/5 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <TicketPercent className="size-4 text-brand" />
                      <span className="font-mono font-medium text-brand">
                        {formData.appliedCoupon.code}
                      </span>
                      <span className="text-gray-600">
                        {formData.appliedCoupon.discountType === "fixed"
                          ? `折抵 NT$${formData.appliedCoupon.value}`
                          : `折扣 ${formData.appliedCoupon.value}%`}
                        {discountAmount > 0 && ` −NT$${discountAmount}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onRemoveCoupon}
                      className="flex size-7 items-center justify-center rounded text-gray-400 hover:text-red-500"
                      aria-label="移除折扣碼"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="couponCode"
                      placeholder="輸入折扣碼（選填）"
                      value={formData.couponCode}
                      onChange={(e) =>
                        onFormFieldChange(
                          "couponCode",
                          e.target.value.toUpperCase()
                        )
                      }
                      className="flex-1 font-mono uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onApplyCoupon}
                      disabled={!formData.couponCode.trim() || applyingCoupon}
                      className="border-brand text-brand hover:bg-brand/10"
                    >
                      {applyingCoupon ? "驗證中…" : "套用"}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-1 text-sm text-red-500">{couponError}</p>
                )}
              </div>
            )}

            {formData.appliedCoupon && discountAmount > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                <span className="text-gray-500">折扣後金額</span>
                <span>
                  <span className="mr-2 text-gray-400 line-through">
                    ${formData.totalAmount}
                  </span>
                  <span className="font-semibold text-brand">${finalAmount}</span>
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={onNext}
            disabled={!canProceed || applyingCoupon}
            className="w-full bg-brand text-white hover:bg-brand-hover h-12 text-base font-medium"
          >
            {applyingCoupon ? "驗證折扣碼…" : "選擇付款方式"}
          </Button>
        </div>
      </div>
    </div>
  );
}
