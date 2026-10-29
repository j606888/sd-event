"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BasicInfoLayout } from "./BasicInfoLayout";
import { EventFormDrawers } from "./EventFormDrawers";
import { TicketSettings } from "./tickets/TicketSettings";
import { useEventForm, type EventFormInitialData } from "@/hooks/use-event-form";
import { useReadOnly } from "@/hooks/use-session";
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
  const t = useTranslations("eventForm.editTabs");
  const tCommon = useTranslations("common");
  const readOnly = useReadOnly();
  const form = useEventForm({
    mode: "edit",
    teamId,
    eventId,
    initialData,
    onSaveSuccess,
  });

  const { title, locationId, bankInfoId, saveError, saving, basicDirty, handleSubmit } = form;

  // 送出前若必填欄位缺漏，先切到含該欄位的分頁，讓使用者看得到錯誤
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !locationId || !bankInfoId) {
      setTab("basic");
    }
    handleSubmit(e);
  };

  const saveButton = (className: string) => (
    <Button
      type="submit"
      className={className}
      disabled={saving || readOnly}
      title={readOnly ? t("readOnlyTitle") : undefined}
    >
      {saving ? tCommon("saving") : tCommon("saveChanges")}
    </Button>
  );
  const dirty = basicDirty && !saving && !readOnly;

  // sm 以上：儲存列在表單最上方並黏住，改了哪裡都不用滑到底才能存
  const saveBar = (
    <div
      className={`sticky top-0 z-10 hidden items-center gap-3 rounded-2xl border py-1.5 pl-4 pr-1.5 sm:flex ${
        dirty ? "border-butter bg-butter-soft" : "border-card-border bg-white"
      }`}
    >
      <span
        className={`flex flex-1 items-center gap-2 text-[13px] font-medium ${
          dirty ? "text-butter-ink" : "text-muted-ink"
        }`}
      >
        <span
          className={`size-2 shrink-0 rounded-full ${dirty ? "bg-butter" : "bg-brand"}`}
          aria-hidden
        />
        <span>
          {readOnly ? t("readOnly") : dirty ? t("unsaved") : t("saveHint")}
        </span>
      </span>
      {saveButton("h-9 rounded-xl px-7 font-bold")}
    </div>
  );

  // 手機：sticky 在底部導覽列上方
  const saveFooter = (
    <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-1.5 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur sm:hidden">
      {saveButton("w-full font-bold")}
      {readOnly && (
        <p className="text-xs text-butter-ink">{t("readOnly")}</p>
      )}
      {dirty && <p className="text-xs text-butter-ink">{t("unsaved")}</p>}
    </div>
  );

  const errorBanner = saveError ? (
    <p className="flex items-center gap-1.5 text-sm text-red-600">
      <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
      <span>{saveError}</span>
    </p>
  ) : null;

  return (
    <div className="w-full">
      {/* 基本資訊（含主辦與收款） */}
      <form
        className={`max-w-6xl flex-col gap-3.5 ${activeTab === "basic" ? "flex" : "hidden"}`}
        onSubmit={onSubmit}
      >
        {saveBar}
        {errorBanner}
        <BasicInfoLayout mode="edit" form={form} />
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
