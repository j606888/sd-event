"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BasicInfoFields } from "./BasicInfoFields";
import { OrganizerPaymentFields } from "./OrganizerPaymentFields";
import { EventFormDrawers } from "./EventFormDrawers";
import { TicketSettings } from "./tickets/TicketSettings";
import { useEventForm } from "@/hooks/use-event-form";
import type { EventType } from "@/lib/event-templates";

export type { EventFormInitialData } from "@/hooks/use-event-form";

type SectionId = "basic" | "items";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "基本資訊" },
  { id: "items", label: "票券設定" },
];

type EventFormProps = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: import("@/hooks/use-event-form").EventFormInitialData;
  /** create 模式的初始類型（由建立頁的範本選擇器帶入） */
  initialType?: EventType;
  submitLabel: string;
  onSaveSuccess?: () => void;
  renderExtraActions?: React.ReactNode;
};

/**
 * 建立活動流程的表單（create 模式）：兩段式（基本資訊（含主辦與收款）／票券設定），
 * 所有設定在按「建立活動」時一次送出。
 * 編輯既有活動改走 EventEditTabs（URL 分頁 + 票券自動儲存）。
 */
export function EventForm({
  mode,
  teamId,
  eventId,
  initialData,
  initialType,
  submitLabel,
  onSaveSuccess,
  renderExtraActions,
}: EventFormProps) {
  const form = useEventForm({
    mode,
    teamId,
    eventId,
    initialData,
    initialType,
    onSaveSuccess,
  });
  const {
    title,
    locationId,
    organizerId,
    bankInfoId,
    saveError,
    saving,
    handleSubmit,
  } = form;

  const [activeSection, setActiveSection] = useState<SectionId>("basic");

  // 送出前若必填欄位缺漏，先切到含該欄位的 Tab，讓使用者看得到錯誤
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !locationId || !organizerId || !bankInfoId) {
      setActiveSection("basic");
    }
    handleSubmit(e);
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {saveError && (
          <p className="flex max-w-2xl items-center gap-1.5 text-sm text-red-600">
            <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
            {saveError}
          </p>
        )}

        {/* 分段切換：基本資訊 / 票券設定 */}
        {/* 只有票券設定需要吃滿寬（左右兩欄），其餘控制項維持窄欄，與編輯頁一致 */}
        <div
          className="grid max-w-2xl grid-cols-2 gap-1 rounded-full bg-gray-100 p-1"
          role="tablist"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={activeSection === s.id}
              onClick={() => setActiveSection(s.id)}
              className={`rounded-full px-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeSection === s.id
                  ? "bg-white text-ink shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 基本資訊（含主辦與收款） */}
        <div
          className={`max-w-2xl flex-col gap-4 ${
            activeSection === "basic" ? "flex" : "hidden"
          }`}
        >
          <BasicInfoFields mode={mode} form={form} />
          <OrganizerPaymentFields form={form} />
        </div>

        {/* 票券設定 */}
        <div className={activeSection === "items" ? "" : "hidden"}>
          <TicketSettings mode={mode} form={form} />
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-1 sm:max-w-2xl sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          {mode === "create" && (
            <Button type="button" variant="outline" asChild className="flex-1 min-w-[100px]">
              <Link href="/events">取消</Link>
            </Button>
          )}
          {renderExtraActions}
          <Button
            type="submit"
            className="flex-1 min-w-[100px] bg-primary text-white hover:bg-brand-hover"
            disabled={saving}
          >
            {saving ? (mode === "edit" ? "更新中…" : "儲存中…") : submitLabel}
          </Button>
        </div>
      </form>

      <EventFormDrawers mode={mode} teamId={teamId} eventId={eventId} form={form} />
    </div>
  );
}
