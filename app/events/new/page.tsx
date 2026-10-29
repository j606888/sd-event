"use client";

import { useState } from "react";
import { Disc3, GraduationCap, Tent, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EventForm } from "@/components/events/management/EventForm";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { EVENT_TYPES, type EventType } from "@/lib/event-templates";

const TYPE_ICON: Record<EventType, LucideIcon> = {
  Party: Disc3,
  Workshop: GraduationCap,
  Festival: Tent,
};

export default function NewEventPage() {
  const { teamId } = useCurrentTeam();
  const t = useTranslations("eventForm");
  const tCommon = useTranslations("common");
  const [selectedType, setSelectedType] = useState<EventType | null>(null);

  if (teamId == null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  // 第一步：選擇活動類型，據此預填購買項目範本
  if (selectedType == null) {
    return (
      <div className="w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          {t("newEvent.title")}
        </h1>
        <p className="mb-8 text-sm text-muted-ink">
          {t("newEvent.chooseType")}
        </p>
        <div className="flex flex-col gap-3">
          {EVENT_TYPES.map((option) => {
            const Icon = TYPE_ICON[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedType(option.value)}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="block text-sm text-muted-ink">
                    {t(`typeDescriptions.${option.value}`)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-gray-300 transition-colors group-hover:text-brand-strong" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 票券設定是左右兩欄（編輯器＋報名頁預覽），與編輯頁同寬才不會把左欄擠成一條
  return (
    <div className="w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">{t("newEvent.title")}</h1>
      <EventForm
        mode="create"
        teamId={teamId}
        initialType={selectedType}
        submitLabel={t("newEvent.submit")}
      />
    </div>
  );
}
