"use client";

import { useParams } from "next/navigation";
import { EventApplicationForm } from "@/components/events/registration/EventApplicationForm";
import { usePublicEvent } from "@/hooks/use-public-event";

export default function PublicEventPage() {
  const params = useParams();
  const publicKey = params?.publicKey as string | undefined;
  const { data: event, isLoading, isError, error } = usePublicEvent(publicKey);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error?.message ?? "無法載入活動"}</p>
        <p className="text-sm text-gray-500">連結可能已失效或活動已刪除</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">找不到活動</p>
        <p className="text-sm text-gray-500">連結可能已失效或活動已刪除</p>
      </div>
    );
  }

  return <EventApplicationForm event={event} />;
}
