"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeamRole } from "@/hooks/use-team-role";

/**
 * 只給管理員看的頁面：驗票人員一律導回活動列表。
 *
 * 這只是避免驗票人員看到一頁 403 錯誤 —— 真正的權限在 API 端，
 * 這些頁面用到的 API 全都是 requireTeamAdmin。
 *
 * 回傳 `ready`：角色確認為管理員前不要 render 內容。
 */
export function useRequireTeamAdmin(): { ready: boolean } {
  const router = useRouter();
  const { isAdmin, isLoading } = useTeamRole();

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/events");
  }, [isLoading, isAdmin, router]);

  return { ready: !isLoading && isAdmin };
}
