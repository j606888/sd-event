"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EventApplicationForm } from "@/components/events/EventApplicationForm";

type Location = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

type Organizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
};

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type PurchaseItem = {
  id: number;
  name: string;
  amount: number;
};

type NoticeItem = {
  id: number;
  content: string;
};

type EventData = {
  id: number;
  publicKey: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  status: string;
  location: Location | null;
  organizer: Organizer | null;
  bankInfo: BankInfo | null;
  purchaseItems: PurchaseItem[];
  noticeItems: NoticeItem[];
};

export default function PublicEventPage() {
  const params = useParams();
  const publicKey = params?.publicKey as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    fetch(`/api/events/public/${encodeURIComponent(publicKey)}`)
      .then((res) => {
        if (res.status === 404) {
          setError("找不到活動");
          return null;
        }
        if (!res.ok) throw new Error("無法載入");
        return res.json();
      })
      .then((data) => (data?.event ? setEvent(data.event) : null))
      .catch(() => setError("無法載入活動"))
      .finally(() => setLoading(false));
  }, [publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "找不到活動"}</p>
        <p className="text-sm text-gray-500">連結可能已失效或活動已刪除</p>
      </div>
    );
  }

  const isPublished = event.status === "published";

  // if (!isPublished) {
  //   return (
  //     <div className="min-h-screen p-6 flex items-center justify-center">
  //       <div className="max-w-lg w-full rounded-lg border border-gray-200 bg-white shadow-sm p-6">
  //         <p className="text-center text-gray-500">
  //           此活動尚未開放報名，主辦方仍在準備中。
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return <EventApplicationForm event={event} />;
}
