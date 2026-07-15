"use client";

import { OrganizerSelect } from "./OrganizerSelect";
import { BankInfoSelect } from "./BankInfoSelect";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/** 主辦與收款欄位：主辦單位／銀行資訊（create 與 edit 共用） */
export function OrganizerPaymentFields({ form }: { form: UseEventFormReturn }) {
  const {
    organizerId,
    organizers,
    setOrganizerId,
    bankInfoId,
    bankInfos,
    setBankInfoId,
    openDrawer,
  } = form;

  return (
    <>
      <OrganizerSelect
        value={organizerId}
        organizers={organizers}
        onValueChange={setOrganizerId}
        onAddClick={openDrawer("organizer")}
      />
      <BankInfoSelect
        value={bankInfoId}
        bankInfos={bankInfos}
        onValueChange={setBankInfoId}
        onAddClick={openDrawer("bank")}
      />
    </>
  );
}
