"use client";

import { useState } from "react";
import { EventForm } from "@/components/events/management/EventForm";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { EVENT_TYPES, type EventType } from "@/lib/event-templates";

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
      <div className="w-full max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">建立新活動</h1>
        <p className="mb-8 text-sm text-gray-500">
          選擇活動類型，我們會幫你預先填好對應的票價時段與購買項目範本（之後都可以調整）。
        </p>
        <div className="flex flex-col gap-3">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSelectedType(t.value)}
              className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-[#5295BC] hover:bg-[#5295BC]/5"
            >
              <span className="text-base font-semibold text-gray-900">{t.label}</span>
              <span className="text-sm text-gray-500">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">建立新活動</h1>
      <EventForm
        mode="create"
        teamId={teamId}
        initialType={selectedType}
        submitLabel="儲存草稿"
      />
    </div>
  );
}
