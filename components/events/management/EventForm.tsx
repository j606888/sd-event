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

type SectionId = "basic" | "items" | "contact";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "基本資訊" },
  { id: "items", label: "票券設定" },
  { id: "contact", label: "主辦與收款" },
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
 * 建立活動流程的表單（create 模式）：三段式（基本資訊／票券設定／主辦與收款），
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
    if (!title.trim() || !locationId) {
      setActiveSection("basic");
    } else if (!organizerId || !bankInfoId) {
      setActiveSection("contact");
    }
    handleSubmit(e);
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {saveError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {saveError}
          </p>
        )}

        {/* 分段切換：基本資訊 / 票券設定 / 主辦與收款 */}
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={activeSection === s.id}
              onClick={() => setActiveSection(s.id)}
              className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                activeSection === s.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 基本資訊 */}
        <div
          className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 ${
            activeSection === "basic" ? "" : "hidden"
          }`}
        >
          <BasicInfoFields mode={mode} form={form} />
        </div>

        {/* 票券設定 */}
        <div className={activeSection === "items" ? "" : "hidden"}>
          <TicketSettings mode={mode} form={form} />
        </div>

        {/* 主辦與收款 */}
        <div
          className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 ${
            activeSection === "contact" ? "" : "hidden"
          }`}
        >
          <OrganizerPaymentFields form={form} />
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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
