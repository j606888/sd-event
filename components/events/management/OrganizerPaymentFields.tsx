"use client";

import { OrganizerSelect } from "./OrganizerSelect";
import { BankInfoSelect } from "./BankInfoSelect";
import { LinePayeeSelect } from "./LinePayeeSelect";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/** 主辦與收款欄位：主辦單位／銀行資訊／LINE 付款好友（create 與 edit 共用） */
export function OrganizerPaymentFields({ form }: { form: UseEventFormReturn }) {
  const {
    organizerId,
    organizers,
    setOrganizerId,
    bankInfoId,
    bankInfos,
    setBankInfoId,
    linePayeeId,
    linePayees,
    setLinePayeeId,
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
      <LinePayeeSelect
        value={linePayeeId}
        linePayees={linePayees}
        onValueChange={setLinePayeeId}
        onAddClick={openDrawer("linePayee")}
      />
    </>
  );
}
