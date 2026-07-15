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
 * 編輯模式的表單分頁殼：基本資訊（含主辦與收款）／票券設定。
 * useEventForm 只在這裡實例化一次；兩個面板全程 mounted、用 hidden 切換，
 * 未儲存的編輯在切分頁時不會消失。
 * 儲存語意：基本資訊需按「儲存變更」；票券設定即時自動儲存。
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
    if (!title.trim() || !locationId || !organizerId || !bankInfoId) {
      setTab("basic");
    }
    handleSubmit(e);
  };

  const saveFooter = (
    // 手機版 sticky 在底部導覽列上方；sm 起回到內容流
    <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-1.5 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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
    <p className="flex items-center gap-1.5 text-sm text-red-600">
      <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
      {saveError}
    </p>
  ) : null;

  return (
    <div className="w-full">
      {/* 基本資訊（含主辦與收款） */}
      <form
        className={`max-w-2xl flex-col gap-5 ${activeTab === "basic" ? "flex" : "hidden"}`}
        onSubmit={onSubmit}
      >
        {errorBanner}
        <BasicInfoFields mode="edit" form={form} />
        <OrganizerPaymentFields form={form} />
        {saveFooter}
      </form>

      {/* 票券設定（自動儲存，無送出按鈕） */}
      <div className={activeTab === "tickets" ? "" : "hidden"}>
        <TicketSettings mode="edit" form={form} />
      </div>

      <EventFormDrawers mode="edit" teamId={teamId} eventId={eventId} form={form} />
    </div>
  );
}
