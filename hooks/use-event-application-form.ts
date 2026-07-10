"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PublicEventData, EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";
import type { FormData, Participant } from "@/components/events/registration/event-application-types";
import { INITIAL_FORM_DATA } from "@/components/events/registration/event-application-types";
import { createRegistration } from "@/lib/api/create-registration";
import { validateCoupon } from "@/lib/api/validate-coupon";
import { computeCouponDiscount } from "@/lib/coupon";

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
    setFormData((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        { id: String(Date.now()), name: "", role: "Leader" as const },
      ],
    }));
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setFormData((prev) => {
      if (prev.participants.length <= 1) return prev;
      const updated = {
        ...prev,
        participants: prev.participants.filter((p) => p.id !== id),
      };
      return updated;
    });
  }, []);

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

    let total = 0;
    if (useGroups) {
      // 群組模式：Σ(已選項目當下時段價) × 參加者人數
      total =
        selectedPlans.reduce((sum, item) => sum + item.amount, 0) *
        formData.participants.length;
    } else if (event.allowMultiplePurchase && formData.selectedPlanIds.length > 0) {
      // Multiple selection: sum of all selected items * participant count
      const plans = event.purchaseItems.filter(
        (item) => formData.selectedPlanIds.includes(item.id)
      );
      total = plans.reduce((sum, item) => sum + item.amount, 0) * formData.participants.length;
    } else if (formData.selectedPlanId != null) {
      // Single selection: selected item amount * participant count
      const plan = event.purchaseItems.find((item) => item.id === formData.selectedPlanId);
      if (plan) {
        total = plan.amount * formData.participants.length;
      }
    }

    // 群組模式即使歸零也要同步（清空選取時）；無群組沿用「僅 >0 才回填」舊行為
    if (total > 0 || useGroups) {
      setFormData((prev) =>
        prev.totalAmount === String(total)
          ? prev
          : { ...prev, totalAmount: String(total) }
      );
    }
  }, [useGroups, event.autoCalcAmount, event.allowMultiplePurchase, event.purchaseItems, formData.selectedByGroup, formData.selectedPlanId, formData.selectedPlanIds, formData.participants.length, selectedPlans]);

  // 折扣預覽：totalAmount 維持折扣前 base，折後金額另行導出，與伺服器計算一致
  const baseAmount = Number(formData.totalAmount) || 0;
  const discountAmount =
    couponsSupported && formData.appliedCoupon
      ? computeCouponDiscount(baseAmount, formData.appliedCoupon)
      : 0;
  const finalAmount = baseAmount - discountAmount;

  const applyCoupon = useCallback(async () => {
    const code = formData.couponCode.trim();
    if (!code) return;
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
      } else {
        setCouponError(result.error);
      }
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "驗證折扣碼失敗，請稍後再試"
      );
    } finally {
      setApplyingCoupon(false);
    }
  }, [event.id, formData.couponCode]);

  const removeCoupon = useCallback(() => {
    setCouponError(null);
    setFormData((prev) => ({ ...prev, appliedCoupon: null }));
  }, []);

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
        attendees: formData.participants.map((p) => ({ name: p.name, role: p.role })),
      });

      router.push(`/registration-success/${result.registration.registrationKey}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "網路錯誤，請稍後再試";
      // 折扣碼在送出瞬間被搶完：清除已套用狀態讓使用者以原價重試
      if (message.includes("折扣碼")) {
        setFormData((prev) => ({ ...prev, appliedCoupon: null }));
        setCouponError(message);
      }
      setSubmitError(message);
      setSubmitting(false);
    }
  }, [event.id, event.allowMultiplePurchase, useGroups, formData, router, couponsSupported, finalAmount]);

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
    handleCopy,
    addParticipant,
    removeParticipant,
    updateParticipant,
    canProceedToStep2,
    canProceedToStep3,
    submitRegistration,
    couponsSupported,
    applyingCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    discountAmount,
    finalAmount,
  };
}
