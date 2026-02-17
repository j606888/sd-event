"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicEvent } from "@/lib/api/public-event";

export function usePublicEvent(publicKey: string | undefined) {
  return useQuery({
    queryKey: ["publicEvent", publicKey],
    queryFn: () => getPublicEvent(publicKey!),
    enabled: !!publicKey,
  });
}
