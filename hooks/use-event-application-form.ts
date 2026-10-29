"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PublicEventData, EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";
import type { FormData, Participant } from "@/components/events/registration/event-application-types";
import { INITIAL_FORM_DATA } from "@/components/events/registration/event-application-types";
import {
  createRegistration,
  CreateRegistrationError,
  MISSING_REGISTRATION_KEY,
} from "@/lib/api/create-registration";
import { validateCoupon } from "@/lib/api/validate-coupon";
import { computeCouponDiscount } from "@/lib/coupon";
import {
  computeItemsTotal,
  findSeatCountMismatch,
  isBundleItem,
  requiredAttendeeCount,
} from "@/lib/seat-count";
import {
  findFlaggedShortfall,
  normalizeFlagLabel,
  requiredFlaggedCount,
} from "@/lib/attendee-flag";

export type EventApplicationFormState = {
  step: 1 | 2 | 3;
  formData: FormData;
  agreedToTerms: boolean;
  copiedText: string | null;
  submitting: boolean;
  submitError: string | null;
};

export function useEventApplicationForm(event: PublicEventData) {
  const router = useRouter();
  const t = useTranslations("publicEvent.errors");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // 活動有群組 → 走群組模型；否則沿用舊的 single / multiple 欄位
  const useGroups = event.groups.length > 0;

  // 折扣碼：活動有設定折扣碼，且金額由伺服器權威計算（群組或 autoCalc）才開放
  const couponsSupported =
    Boolean(event.hasCoupons) && (useGroups || event.autoCalcAmount);

  // 群組被互斥鎖住：其互斥對象已有選取（鎖住時本群組視為無需選取）
  const isGroupLocked = (g: EventPurchaseItemGroup) =>
    (g.excludesGroupIds ?? []).some(
      (exId) => (formData.selectedByGroup[exId]?.length ?? 0) > 0
    );

  const selectedPlan = event.purchaseItems.find(
    (item) => item.id === formData.selectedPlanId
  ) ?? null;

  // 已選項目的扁平清單（群組/非群組共用，供金額計算與摘要顯示）
  const selectedPlans: EventPurchaseItem[] = useGroups
    ? event.groups.flatMap((g) =>
        (formData.selectedByGroup[g.id] ?? [])
          .map((id) => g.items.find((it) => it.id === id))
          .filter((it): it is EventPurchaseItem => it != null)
      )
    : event.purchaseItems.filter((item) =>
        formData.selectedPlanIds.includes(item.id)
      );

  // 實際要送出的項目（單選舊制只有 selectedPlan）
  const chosenItems = useMemo<EventPurchaseItem[]>(
    () =>
      useGroups || event.allowMultiplePurchase
        ? selectedPlans
        : selectedPlan
          ? [selectedPlan]
          : [],
    [useGroups, event.allowMultiplePurchase, selectedPlans, selectedPlan]
  );

  // 選了套票（如雙人票）→ 參加者人數固定為套票人數
  const requiredParticipants = requiredAttendeeCount(chosenItems);
  const bundleItem = chosenItems.find(isBundleItem) ?? null;
  // 只回傳結構化資訊，錯誤文字由報名表元件翻譯（切換語言時會跟著變）
  const seatMismatch = findSeatCountMismatch(chosenItems, formData.participants.length);

  // 參加者勾選項目（如參加伸展台比賽）；票券可要求至少勾幾位
  const flagLabel = normalizeFlagLabel(event.attendeeFlagLabel);
  const requiredFlagged = flagLabel ? requiredFlaggedCount(chosenItems) : 0;
  const flagShortfall = findFlaggedShortfall(
    chosenItems,
    formData.participants.filter((p) => p.flagged).length,
    flagLabel
  );

  // 套票人數變動時，自動補齊空白參加者欄位或移除多出的欄位（保留已填的前幾位）
  useEffect(() => {
    if (requiredParticipants == null) return;
    setFormData((prev) => {
      const current = prev.participants;
      if (current.length === requiredParticipants) return prev;
      const next =
        current.length > requiredParticipants
          ? current.slice(0, requiredParticipants)
          : [
              ...current,
              ...Array.from(
                { length: requiredParticipants - current.length },
                (_, i) => ({
                  id: `${Date.now()}-${i}`,
                  name: "",
                  role: "Leader" as const,
                })
              ),
            ];
      return { ...prev, participants: next };
    });
  }, [requiredParticipants]);

  const handleCopy = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const addParticipant = useCallback(() => {
    if (requiredParticipants != null) return;
    setFormData((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        { id: String(Date.now()), name: "", role: "Leader" as const },
      ],
    }));
  }, [requiredParticipants]);

  const removeParticipant = useCallback((id: string) => {
    if (requiredParticipants != null) return;
    setFormData((prev) => {
      if (prev.participants.length <= 1) return prev;
      const updated = {
        ...prev,
        participants: prev.participants.filter((p) => p.id !== id),
      };
      return updated;
    });
  }, [requiredParticipants]);

  const updateParticipant = useCallback(
    (id: string, field: keyof Participant, value: string) => {
      setFormData((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      }));
    },
    []
  );

  const toggleParticipantFlag = useCallback((id: string, flagged: boolean) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.map((p) => (p.id === id ? { ...p, flagged } : p)),
    }));
  }, []);

  const setFormField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  }, []);

  // Auto-calculate total amount.
  // 群組活動一律自動算；無群組活動沿用 autoCalcAmount 開關。
  useEffect(() => {
    if (!useGroups && !event.autoCalcAmount) return;

    // 一般票：當下時段價 × 參加者人數；套票：整組價（與伺服器 computeItemsTotal 一致）
    const total = computeItemsTotal(
      chosenItems.map((item) => ({ unitPrice: item.amount, seatCount: item.seatCount })),
      formData.participants.length
    );

    // 群組模式即使歸零也要同步（清空選取時）；無群組沿用「僅 >0 才回填」舊行為
    if (total > 0 || useGroups) {
      setFormData((prev) =>
        prev.totalAmount === String(total)
          ? prev
          : { ...prev, totalAmount: String(total) }
      );
    }
  }, [useGroups, event.autoCalcAmount, formData.participants.length, chosenItems]);

  // 折扣預覽：totalAmount 維持折扣前 base，折後金額另行導出，與伺服器計算一致
  const baseAmount = Number(formData.totalAmount) || 0;
  const discountAmount =
    couponsSupported && formData.appliedCoupon
      ? computeCouponDiscount(baseAmount, formData.appliedCoupon)
      : 0;
  const finalAmount = baseAmount - discountAmount;

  const applyCoupon = useCallback(async (): Promise<boolean> => {
    const code = formData.couponCode.trim();
    if (!code) return true;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(event.id, code);
      if (result.valid) {
        setFormData((prev) => ({
          ...prev,
          appliedCoupon: result.coupon,
          couponCode: "",
        }));
        return true;
      }
      setCouponError(result.error);
      return false;
    } catch (err) {
      setCouponError((err instanceof Error && err.message) || t("couponCheckFailed"));
      return false;
    } finally {
      setApplyingCoupon(false);
    }
  }, [event.id, formData.couponCode, t]);

  const removeCoupon = useCallback(() => {
    setCouponError(null);
    setFormData((prev) => ({ ...prev, appliedCoupon: null }));
  }, []);

  // 進付款步驟：折扣碼欄有輸入但尚未按「套用」時自動嘗試套用，
  // 驗證失敗就留在本步驟顯示錯誤，避免使用者不知情地以原價送出
  const proceedToPayment = useCallback(async () => {
    if (couponsSupported && !formData.appliedCoupon && formData.couponCode.trim()) {
      const ok = await applyCoupon();
      if (!ok) return;
    }
    setStep(3);
  }, [couponsSupported, formData.appliedCoupon, formData.couponCode, applyCoupon]);

  const canProceedToStep2 = event.noticeItems.length === 0 || agreedToTerms;
  // 群組模式：逐群組驗證 required / selectionMode
  const groupsSatisfied = event.groups.every((g) => {
    if (isGroupLocked(g)) return true;
    const sel = formData.selectedByGroup[g.id] ?? [];
    if (g.required) {
      return g.selectionMode === "single" ? sel.length === 1 : sel.length >= 1;
    }
    return g.selectionMode === "single" ? sel.length <= 1 : true;
  });
  const hasSelectedPlan = useGroups
    ? groupsSatisfied
    : event.allowMultiplePurchase
      ? formData.selectedPlanIds.length > 0
      : formData.selectedPlanId !== null;
  const canProceedToStep3 =
    hasSelectedPlan &&
    seatMismatch == null &&
    flagShortfall == null &&
    formData.contactName.trim() !== "" &&
    formData.contactPhone.trim() !== "" &&
    formData.contactEmail.trim() !== "" &&
    formData.participants.every((p) => p.name.trim() !== "") &&
    formData.totalAmount.trim() !== "";

  const submitRegistration = useCallback(async () => {
    if (!formData.paymentMethod) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const groupSelectedIds = Object.values(formData.selectedByGroup).flat();
      const result = await createRegistration(event.id, {
        purchaseItemId: useGroups
          ? null
          : event.allowMultiplePurchase
            ? null
            : formData.selectedPlanId,
        purchaseItemIds: useGroups
          ? groupSelectedIds
          : event.allowMultiplePurchase
            ? formData.selectedPlanIds
            : [],
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        paymentMethod: formData.paymentMethod,
        // 折扣碼生效時送折後金額（伺服器仍會權威重算）
        totalAmount:
          couponsSupported && formData.appliedCoupon
            ? finalAmount
            : Number(formData.totalAmount),
        couponCode:
          couponsSupported && formData.appliedCoupon
            ? formData.appliedCoupon.code
            : null,
        attendees: formData.participants.map((p) => ({
          name: p.name,
          role: p.role,
          flagged: flagLabel != null && p.flagged === true,
        })),
      });

      router.push(`/registration-success/${result.registration.registrationKey}`);
    } catch (err) {
      const code = err instanceof CreateRegistrationError ? err.code : null;
      const message =
        err instanceof Error
          ? err.message ||
            (code === MISSING_REGISTRATION_KEY ? t("missingRegistrationKey") : t("submitFailed"))
          : t("network");
      // 折扣碼在送出瞬間被搶完（或失效）：清除已套用狀態讓使用者以原價重試。
      // 伺服器訊息已翻譯成使用者的語言，改看錯誤代碼（COUPON_INVALID / COUPON_EXHAUSTED / COUPON_NOT_SUPPORTED）
      if (code?.startsWith("COUPON_")) {
        setFormData((prev) => ({ ...prev, appliedCoupon: null }));
        setCouponError(message);
      }
      setSubmitError(message);
      setSubmitting(false);
    }
  }, [event.id, event.allowMultiplePurchase, useGroups, formData, router, couponsSupported, finalAmount, flagLabel, t]);

  return {
    step,
    setStep,
    formData,
    setFormField,
    agreedToTerms,
    setAgreedToTerms,
    copiedText,
    submitting,
    submitError,
    selectedPlan,
    selectedPlans,
    requiredParticipants,
    bundleItem,
    seatMismatch,
    flagLabel,
    requiredFlagged,
    flagShortfall,
    handleCopy,
    addParticipant,
    removeParticipant,
    updateParticipant,
    toggleParticipantFlag,
    canProceedToStep2,
    canProceedToStep3,
    submitRegistration,
    couponsSupported,
    applyingCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    proceedToPayment,
    discountAmount,
    finalAmount,
  };
}
