"use client";

import { useQuery } from "@tanstack/react-query";

export type EventData = {
  id: number;
  publicKey: string;
  teamId: number;
  userId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  locationId: number | null;
  organizerId: number | null;
  bankInfoId: number | null;
  allowMultiplePurchase: boolean;
  autoCalcAmount: boolean;
  status: string;
  createdAt: string;
  updatedAt: string | null;
};

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("無法載入活動");
      const data = await res.json();
      return data.event as EventData;
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
