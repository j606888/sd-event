"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PublicEventData } from "@/types/event";
import type { FormData, Participant } from "@/components/events/registration/event-application-types";
import { INITIAL_FORM_DATA } from "@/components/events/registration/event-application-types";
import { createRegistration } from "@/lib/api/create-registration";

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

  const selectedPlan = event.purchaseItems.find(
    (item) => item.id === formData.selectedPlanId
  ) ?? null;

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
      return {
        ...prev,
        participants: prev.participants.filter((p) => p.id !== id),
      };
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const canProceedToStep2 = agreedToTerms;
  const canProceedToStep3 =
    formData.selectedPlanId !== null &&
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
      const result = await createRegistration(event.id, {
        purchaseItemId: formData.selectedPlanId,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        paymentMethod: formData.paymentMethod,
        totalAmount: Number(formData.totalAmount),
        attendees: formData.participants.map((p) => ({ name: p.name, role: p.role })),
      });

      router.push(`/registration-success/${result.registration.registrationKey}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "網路錯誤，請稍後再試");
      setSubmitting(false);
    }
  }, [event.id, formData, router]);

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
    handleCopy,
    addParticipant,
    removeParticipant,
    updateParticipant,
    canProceedToStep2,
    canProceedToStep3,
    submitRegistration,
  };
}
