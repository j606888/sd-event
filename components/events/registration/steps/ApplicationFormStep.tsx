"use client";

import type { ReactNode } from "react";
import { ChevronLeft, Trash2, Plus, TicketPercent, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLanguageBar } from "@/components/layout/PublicLanguageBar";
import { richText } from "@/lib/rich-text";
import type { SeatCountMismatch } from "@/lib/seat-count";
import type { FlaggedShortfall } from "@/lib/attendee-flag";
import type { EventPurchaseItem, PublicEventData } from "@/types/event";
import type { FormData, Participant } from "../event-application-types";
import { GroupTicketPicker } from "../GroupTicketPicker";

const ROLES = ["Leader", "Follower", "Not sure"] as const;

type ApplicationFormStepProps = {
  event: PublicEventData;
  formData: FormData;
  onFormFieldChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (id: string, field: keyof Participant, value: string) => void;
  /** 選了套票時固定的參加者人數；null = 可自由增減 */
  requiredParticipants: number | null;
  /** 已選的套票（顯示其參加條件）；null = 未選套票 */
  bundleItem: EventPurchaseItem | null;
  /** 參加者人數不符套票時的資訊（由本元件組成錯誤訊息）；null = 符合 */
  seatMismatch: SeatCountMismatch | null;
  /** 參加者勾選項目名稱（如「參加伸展台比賽」）；null = 不顯示勾選框 */
  flagLabel: string | null;
  /** 勾選人數不足所選票券要求時的資訊（由本元件組成提示）；null = 符合 */
  flagShortfall: FlaggedShortfall | null;
  onToggleParticipantFlag: (id: string, flagged: boolean) => void;
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
  requiredParticipants,
  bundleItem,
  seatMismatch,
  flagLabel,
  flagShortfall,
  onToggleParticipantFlag,
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
  const t = useTranslations("publicEvent.form");
  const roleLabel = (role: (typeof ROLES)[number]) =>
    role === "Not sure" ? t("roleNotSure") : role;
  const seatError = seatMismatch ? t("seatCountMismatch", seatMismatch) : null;
  const flagError = flagShortfall ? t("flaggedShortfall", flagShortfall) : null;

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

        <div className="px-4 py-6 space-y-6">

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t("contactHeading")}</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="contactName">{t("contactNameLabel")}</Label>
                <Input
                  id="contactName"
                  placeholder={t("contactNamePlaceholder")}
                  value={formData.contactName}
                  onChange={(e) => onFormFieldChange("contactName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">{t("phoneLabel")}</Label>
                <Input
                  id="contactPhone"
                  placeholder={t("phonePlaceholder")}
                  value={formData.contactPhone}
                  onChange={(e) => onFormFieldChange("contactPhone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">{t("emailLabel")}</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder={t("emailPlaceholder")}
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
            fullTierName={event.fullPriceTierName ?? null}
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
            <h2 className="font-semibold text-gray-900">{t("attendeesHeading")}</h2>
            {bundleItem && requiredParticipants != null && (
              <div className="flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-gray-700">
                <Users className="mt-0.5 size-4 shrink-0 text-brand-strong" />
                <div className="space-y-1">
                  <p>
                    {t.rich("bundleNotice", {
                      name: bundleItem.name,
                      count: requiredParticipants,
                      b: (chunks: ReactNode) => (
                        <span className="font-medium">{richText(chunks)}</span>
                      ),
                      num: (chunks: ReactNode) => <span>{richText(chunks)}</span>,
                    })}
                  </p>
                  {bundleItem.description && (
                    <p className="whitespace-pre-line text-gray-600">
                      {bundleItem.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {formData.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 bg-brand text-ink rounded text-sm font-medium">
                      {t("attendeeN", { n: index + 1 })}
                    </div>
                    {formData.participants.length > 1 && requiredParticipants == null && (
                      <button
                        onClick={() => onRemoveParticipant(participant.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label>{t("attendeeNameLabel")}</Label>
                    <Input
                      placeholder={t("attendeeNamePlaceholder")}
                      value={participant.name}
                      onChange={(e) =>
                        onUpdateParticipant(participant.id, "name", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t("roleLabel")}</Label>
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
                            {roleLabel(role)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {flagLabel && (
                    <label className="flex cursor-pointer items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={participant.flagged === true}
                        onChange={(e) =>
                          onToggleParticipantFlag(participant.id, e.target.checked)
                        }
                        className="size-4 rounded border-gray-300 accent-brand"
                      />
                      <span className="text-sm text-gray-700">{flagLabel}</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            {requiredParticipants == null && (
              <Button
                onClick={onAddParticipant}
                variant="outline"
                className="w-full border-brand text-brand-strong hover:bg-brand/10"
              >
                <Plus className="w-4 h-4" />
                <span>{t("addAttendee")}</span>
              </Button>
            )}
            {seatError && <p className="text-sm text-red-500">{seatError}</p>}
            {!seatError && flagError && (
              <p className="text-sm text-amber-600">{flagError}</p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">{t("costHeading")}</h2>
            <div>
              <Label htmlFor="totalAmount">
                {event.autoCalcAmount || event.groups.length > 0
                  ? t("totalAuto")
                  : t("totalManual")}
              </Label>
              <Input
                id="totalAmount"
                placeholder={t("totalPlaceholder")}
                type="number"
                value={formData.totalAmount}
                onChange={(e) => onFormFieldChange("totalAmount", e.target.value)}
                disabled={event.autoCalcAmount || event.groups.length > 0}
                className="mt-1"
              />
            </div>

            {couponsSupported && (
              <div>
                <Label htmlFor="couponCode">{t("couponLabel")}</Label>
                {formData.appliedCoupon ? (
                  <div className="mt-1 flex items-center justify-between rounded-lg border border-brand bg-brand/5 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <TicketPercent className="size-4 text-brand-strong" />
                      <span className="font-mono font-medium text-brand-strong">
                        {formData.appliedCoupon.code}
                      </span>
                      <span className="text-gray-600">
                        <span>
                          {formData.appliedCoupon.discountType === "fixed"
                            ? t("couponFixed", { value: String(formData.appliedCoupon.value) })
                            : t("couponPercent", { value: String(formData.appliedCoupon.value) })}
                        </span>
                        {discountAmount > 0 && <span>{` −NT$${discountAmount}`}</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onRemoveCoupon}
                      className="flex size-7 items-center justify-center rounded text-gray-400 hover:text-red-500"
                      aria-label={t("removeCoupon")}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="couponCode"
                      placeholder={t("couponPlaceholder")}
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
                      className="border-brand text-brand-strong hover:bg-brand/10"
                    >
                      {applyingCoupon ? t("couponChecking") : t("couponApply")}
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
                <span className="text-gray-500">{t("discountedTotal")}</span>
                <span>
                  <span className="mr-2 text-gray-400 line-through">
                    {`$${formData.totalAmount}`}
                  </span>
                  <span className="font-semibold text-brand-strong">{`$${finalAmount}`}</span>
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={onNext}
            disabled={!canProceed || applyingCoupon}
            className="w-full bg-brand text-ink hover:bg-brand-hover h-12 text-base font-medium"
          >
            {applyingCoupon ? t("checkingCoupon") : t("toPayment")}
          </Button>
        </div>
      </div>
    </div>
  );
}
