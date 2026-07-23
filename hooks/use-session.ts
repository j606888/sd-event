"use client";

import { useQuery } from "@tanstack/react-query";

export type Impersonation = {
  adminName: string;
  adminEmail: string;
  targetName: string;
  targetEmail: string;
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  activeTeamId: number | null;
  isSuperAdmin: boolean;
};

type MeResponse = {
  user: SessionUser;
  impersonation: Impersonation | null;
};

async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

/** 目前登入者資訊；模擬檢視中 impersonation 有值 */
export function useSession() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60_000,
  });

  return {
    user: data?.user ?? null,
    impersonation: data?.impersonation ?? null,
    isSuperAdmin: data?.user?.isSuperAdmin ?? false,
    isLoading,
  };
}

/**
 * 模擬檢視中一律唯讀。真正的防線在 middleware.ts，
 * 這個 hook 只負責把畫面上的寫入操作先擋下來，避免按了才跳錯誤。
 */
export function useReadOnly(): boolean {
  const { impersonation } = useSession();
  return impersonation !== null;
}
