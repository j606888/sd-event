"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PaymentFilter, HiddenFilter, CheckInFilter } from "@/lib/registration-list-filters";
import type { Registration, RegistrationDetailData } from "@/types/registration";
import {
  createWalkInRegistration,
  type CreateWalkInBody,
} from "@/lib/api/create-walk-in";

export type { Registration, RegistrationDetailData };

export type RegistrationsParams = {
  search: string;
  page: number;
  pageSize: number;
  paymentStatus: PaymentFilter;
  hiddenFilter: HiddenFilter;
  checkInFilter: CheckInFilter;
};

export function useRegistrations(eventId: string, params: RegistrationsParams) {
  return useQuery({
    queryKey: ["registrations", eventId, params],
    queryFn: async () => {
      const qs = new URLSearchParams({
        ...(params.search && { search: params.search }),
        page: String(params.page),
        pageSize: String(params.pageSize),
        paymentStatus: params.paymentStatus,
        hiddenFilter: params.hiddenFilter,
        checkInFilter: params.checkInFilter,
      });
      const res = await fetch(`/api/events/${eventId}/registrations?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("無法載入報名列表");
      return res.json() as Promise<{
        registrations: Registration[];
        pagination: { total: number; page: number; pageSize: number };
      }>;
    },
    enabled: !!eventId,
    staleTime: 10_000,
    placeholderData: (prev: unknown) => prev as { registrations: Registration[]; pagination: { total: number; page: number; pageSize: number } } | undefined,
  });
}

export function useRegistrationDetail(
  eventId: string,
  registrationId: number | null
) {
  return useQuery({
    queryKey: ["registration", eventId, registrationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/registrations/${registrationId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("無法載入報名詳情");
      const data = await res.json();
      return data.registration as RegistrationDetailData;
    },
    enabled: !!eventId && registrationId !== null,
    staleTime: 10_000,
  });
}

export function useUpdateRegistration(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      registrationId,
      patch,
    }: {
      registrationId: number;
      patch: Record<string, unknown>;
    }) => {
      const res = await fetch(
        `/api/events/${eventId}/registrations/${registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        }
      );
      if (!res.ok) throw new Error("更新失敗");
      return res.json();
    },
    onSuccess: (
      _data: unknown,
      { registrationId }: { registrationId: number; patch: Record<string, unknown> }
    ) => {
      queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["registration", eventId, registrationId],
      });
      // 編輯可能變更角色/人數/付款狀態，連動統計
      queryClient.invalidateQueries({ queryKey: ["eventStats", eventId] });
    },
  });
}

export function useCreateWalkIn(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWalkInBody) =>
      createWalkInRegistration(Number(eventId), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
      queryClient.invalidateQueries({ queryKey: ["eventStats", eventId] });
    },
  });
}

export function useCheckIn(
  eventId: string,
  selectedRegistrationId: number | null
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attendeeId: number) => {
      const res = await fetch(`/api/attendees/${attendeeId}/check-in`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "檢查入場失敗");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["registration", eventId, selectedRegistrationId],
      });
      queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
    },
  });
}
