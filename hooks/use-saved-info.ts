"use client";

import { useQuery } from "@tanstack/react-query";

export type SavedLocation = { id: number; name: string; address: string | null };
export type SavedOrganizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
};
export type SavedBankInfo = {
  id: number;
  label: string | null;
  bankName: string;
  bankCode: string;
  account: string | null;
};
export type SavedLinePayee = { id: number; label: string; lineId: string };

/** 帳戶的顯示名稱：有名稱／備註用它，沒有就用「銀行 代碼」 */
export function bankInfoTitle(bank: SavedBankInfo): string {
  return bank.label || `${bank.bankName} ${bank.bankCode}`;
}

/** 團隊的一種常用資訊（地點、主辦、帳戶、LINE 付款好友） */
function useSavedList<T>(teamId: number | undefined, path: string, field: string, enabled = true) {
  return useQuery({
    queryKey: ["savedInfo", teamId, path],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/${path}`, { credentials: "include" });
      if (!res.ok) throw new Error(path);
      const data = await res.json();
      return (data[field] ?? []) as T[];
    },
    enabled: enabled && teamId != null,
  });
}

export const useSavedLocations = (teamId: number | undefined, enabled?: boolean) =>
  useSavedList<SavedLocation>(teamId, "locations", "locations", enabled);
export const useSavedOrganizers = (teamId: number | undefined, enabled?: boolean) =>
  useSavedList<SavedOrganizer>(teamId, "organizers", "organizers", enabled);
export const useSavedBankInfos = (teamId: number | undefined, enabled?: boolean) =>
  useSavedList<SavedBankInfo>(teamId, "bank-infos", "bankInfos", enabled);
export const useSavedLinePayees = (teamId: number | undefined, enabled?: boolean) =>
  useSavedList<SavedLinePayee>(teamId, "line-payees", "linePayees", enabled);
