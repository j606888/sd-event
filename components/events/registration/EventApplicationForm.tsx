"use client";

import { useEffect } from "react";
import type { EventApplicationFormProps } from "./event-application-types";
import { useEventApplicationForm } from "@/hooks/use-event-application-form";
import { EventDetailsStep } from "./steps/EventDetailsStep";
import { ApplicationFormStep } from "./steps/ApplicationFormStep";
import { PaymentStep } from "./steps/PaymentStep";

export function EventApplicationForm({ event }: EventApplicationFormProps) {
  const form = useEventApplicationForm(event);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [form.step]);

  if (form.step === 1) {
    return (
      <EventDetailsStep
        event={event}
        agreedToTerms={form.agreedToTerms}
        onAgreedToTermsChange={form.setAgreedToTerms}
        canProceed={form.canProceedToStep2}
        onNext={() => form.setStep(2)}
      />
    );
  }

  if (form.step === 2) {
    return (
      <ApplicationFormStep
        event={event}
        formData={form.formData}
        onFormFieldChange={form.setFormField}
        onAddParticipant={form.addParticipant}
        onRemoveParticipant={form.removeParticipant}
        onUpdateParticipant={form.updateParticipant}
        canProceed={form.canProceedToStep3}
        onBack={() => form.setStep(1)}
        onNext={() => form.setStep(3)}
      />
    );
  }

  return (
    <PaymentStep
      event={event}
      formData={form.formData}
      selectedPlan={form.selectedPlan}
      selectedPlans={form.selectedPlans}
      copiedText={form.copiedText}
      onCopy={form.handleCopy}
      onPaymentMethodChange={(method) => form.setFormField("paymentMethod", method)}
      submitError={form.submitError}
      submitting={form.submitting}
      onBack={() => {
        form.setStep(2);
      }}
      onSubmit={form.submitRegistration}
    />
  );
}
