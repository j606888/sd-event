"use client";

import { EventForm } from "@/components/events/management/EventForm";
import { useCurrentTeam } from "@/hooks/use-current-team";

export default function NewEventPage() {
  const { teamId } = useCurrentTeam();

  if (teamId == null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">建立新活動</h1>
      <EventForm
        mode="create"
        teamId={teamId}
        submitLabel="儲存草稿"
      />
    </div>
  );
}
