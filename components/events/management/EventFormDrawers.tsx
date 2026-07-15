"use client";

import { Drawer } from "@/components/ui/drawer";
import { LocationDrawer } from "./LocationDrawer";
import { OrganizerDrawer } from "./OrganizerDrawer";
import { BankInfoDrawer } from "./BankInfoDrawer";
import { PurchaseItemDrawer } from "./PurchaseItemDrawer";
import { NoticeItemDrawer } from "./NoticeItemDrawer";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

type EventFormDrawersProps = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  form: UseEventFormReturn;
};

/** 表單相關抽屜（地點／票券／須知／主辦／銀行），create 與 edit 共用 */
export function EventFormDrawers({ mode, teamId, eventId, form }: EventFormDrawersProps) {
  const {
    drawer,
    closeDrawer,
    editingItemIndex,
    adderDefaultGroupKey,
    purchaseItems,
    priceTiers,
    groups,
    noticeItems,
    handleLocationSuccess,
    handleOrganizerSuccess,
    handleBankInfoSuccess,
    handlePurchaseItemSuccess,
    handlePurchaseItemUpdated,
    handleNoticeItemSuccess,
  } = form;

  if (drawer === null) return null;

  return (
    <Drawer
      open={true}
      onClose={closeDrawer}
      subtitle={
        drawer === "location" || drawer === "organizer" || drawer === "bank"
          ? "New"
          : drawer === "purchaseItem" && editingItemIndex != null
            ? "Edit Item"
            : "New Item"
      }
      title={
        drawer === "location"
          ? "新增活動地點"
          : drawer === "purchaseItem"
            ? editingItemIndex != null
              ? "編輯票券"
              : "新增票券"
            : drawer === "notice"
              ? "新增須知項目"
              : drawer === "organizer"
                ? "新增主辦單位"
                : "新增銀行資訊"
      }
    >
      {drawer === "location" && (
        <LocationDrawer
          teamId={teamId}
          onSuccess={handleLocationSuccess}
          onCancel={closeDrawer}
        />
      )}
      {drawer === "purchaseItem" && (
        <PurchaseItemDrawer
          mode={mode}
          eventId={eventId}
          currentItems={purchaseItems}
          priceTiers={priceTiers}
          groups={groups}
          defaultGroupKey={adderDefaultGroupKey}
          editingItem={
            editingItemIndex != null
              ? { item: purchaseItems[editingItemIndex], index: editingItemIndex }
              : undefined
          }
          onSuccess={handlePurchaseItemSuccess}
          onUpdated={handlePurchaseItemUpdated}
          onCancel={closeDrawer}
        />
      )}
      {drawer === "notice" && (
        <NoticeItemDrawer
          mode={mode}
          eventId={eventId}
          currentItems={noticeItems}
          onSuccess={handleNoticeItemSuccess}
          onCancel={closeDrawer}
        />
      )}
      {drawer === "organizer" && (
        <OrganizerDrawer
          teamId={teamId}
          onSuccess={handleOrganizerSuccess}
          onCancel={closeDrawer}
        />
      )}
      {drawer === "bank" && (
        <BankInfoDrawer
          teamId={teamId}
          onSuccess={handleBankInfoSuccess}
          onCancel={closeDrawer}
        />
      )}
    </Drawer>
  );
}
