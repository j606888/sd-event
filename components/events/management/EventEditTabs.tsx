"use client";

import { Button } from "@/components/ui/button";
import { BasicInfoFields } from "./BasicInfoFields";
import { OrganizerPaymentFields } from "./OrganizerPaymentFields";
import { EventFormDrawers } from "./EventFormDrawers";
import { TicketSettings } from "./tickets/TicketSettings";
import { useEventForm, type EventFormInitialData } from "@/hooks/use-event-form";
import type { EventTabId } from "@/hooks/use-tab-param";

type EventEditTabsProps = {
  teamId: number;
  eventId: number;
  initialData: EventFormInitialData;
  activeTab: EventTabId;
  setTab: (tab: EventTabId) => void;
  onSaveSuccess?: () => void;
};

/**
 * 編輯模式的表單分頁殼：基本資訊／票券設定／主辦與收款。
 * useEventForm 只在這裡實例化一次；三個面板全程 mounted、用 hidden 切換，
 * 未儲存的編輯在切分頁時不會消失。
 * 儲存語意：基本資訊與主辦與收款需按「儲存變更」；票券設定即時自動儲存。
 */
export function EventEditTabs({
  teamId,
  eventId,
  initialData,
  activeTab,
  setTab,
  onSaveSuccess,
}: EventEditTabsProps) {
  const form = useEventForm({
    mode: "edit",
    teamId,
    eventId,
    initialData,
    onSaveSuccess,
  });

  const { title, locationId, organizerId, bankInfoId, saveError, saving, basicDirty, handleSubmit } =
    form;

  // 送出前若必填欄位缺漏，先切到含該欄位的分頁，讓使用者看得到錯誤
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !locationId) {
      setTab("basic");
    } else if (!organizerId || !bankInfoId) {
      setTab("payment");
    }
    handleSubmit(e);
  };

  const saveFooter = (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-1.5 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      <Button
        type="submit"
        className="w-full bg-primary text-white hover:bg-brand-hover sm:w-auto sm:self-start sm:px-8"
        disabled={saving}
      >
        {saving ? "儲存中…" : "儲存變更"}
      </Button>
      {basicDirty && !saving && (
        <p className="text-xs text-amber-600">
          此頁變更需按「儲存變更」才會生效
        </p>
      )}
    </div>
  );

  const errorBanner = saveError ? (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      {saveError}
    </p>
  ) : null;

  return (
    <div className="w-full">
      {/* 基本資訊 */}
      <form
        className={`flex-col gap-5 ${activeTab === "basic" ? "flex" : "hidden"}`}
        onSubmit={onSubmit}
      >
        {errorBanner}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <BasicInfoFields mode="edit" form={form} />
        </div>
        {saveFooter}
      </form>

      {/* 票券設定（自動儲存，無送出按鈕） */}
      <div className={activeTab === "tickets" ? "" : "hidden"}>
        <TicketSettings mode="edit" form={form} />
      </div>

      {/* 主辦與收款 */}
      <form
        className={`flex-col gap-5 ${activeTab === "payment" ? "flex" : "hidden"}`}
        onSubmit={onSubmit}
      >
        {errorBanner}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <OrganizerPaymentFields form={form} />
        </div>
        {saveFooter}
      </form>

      <EventFormDrawers mode="edit" teamId={teamId} eventId={eventId} form={form} />
    </div>
  );
}
