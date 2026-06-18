"use client";

import { useState } from "react";
import { Disc3, GraduationCap, Tent, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const [selectedType, setSelectedType] = useState<EventType | null>(null);

  if (teamId == null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  // 第一步：選擇活動類型，據此預填購買項目範本
  if (selectedType == null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          建立新活動
        </h1>
        <p className="mb-8 text-sm text-muted-ink">
          選擇活動類型，我們會幫你預先填好對應的票價時段與購買項目範本（之後都可以調整）。
        </p>
        <div className="flex flex-col gap-3">
          {EVENT_TYPES.map((t) => {
            const Icon = TYPE_ICON[t.value];
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedType(t.value)}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-leader to-follower text-white">
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold text-ink">
                    {t.label}
                  </span>
                  <span className="block text-sm text-muted-ink">
                    {t.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-gray-300 transition-colors group-hover:text-brand" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">建立新活動</h1>
      <EventForm
        mode="create"
        teamId={teamId}
        initialType={selectedType}
        submitLabel="儲存草稿"
      />
    </div>
  );
}
