"use client";

import { useCurrentTeam } from "@/hooks/use-current-team";
import { isTeamAdmin, type TeamRole } from "@/lib/team-roles";

/**
 * 當前使用者在作用中團隊的角色。UI 判斷權限的唯一來源。
 *
 * 注意載入期間 `role` 為 null，此時 `isAdmin` 與 `isStaff` 都是 false —— 
 * 呼叫端要嘛等 `isLoading` 結束，要嘛用 `isAdmin` 當「顯示管理功能」的條件
 * （寧可少顯示，也不要閃一下管理按鈕）。
 */
export function useTeamRole(): {
  role: TeamRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
} {
  const { role, isLoading } = useCurrentTeam();
  return {
    role,
    isAdmin: isTeamAdmin(role),
    isStaff: role === "staff",
    isLoading,
  };
}
