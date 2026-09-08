// lib/api/teams.ts
import { UnauthorizedError } from "@/lib/api/errors";
import type { TeamRole } from "@/lib/team-roles";

export type Team = {
  id: number;
  name: string;
  createdAt: string;
  /** 當前使用者在這個團隊的角色 */
  role: TeamRole;
};

export async function getTeams(): Promise<Team[]> {
  const res = await fetch("/api/teams", { credentials: "include" });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error("無法載入團隊");
  const data = await res.json();
  return data.teams ?? [];
}

export async function getActiveTeamId() {
  const res = await fetch("/api/user/active-team", { credentials: "include" });
  // 401 不能吞成「沒有作用中團隊」，否則過期的 session 會偽裝成正常的空狀態
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) return null;
  const data = await res.json();
  return data.activeTeamId ?? null;
}

export async function updateActiveTeam(teamId: number) {
  await fetch("/api/user/active-team", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ teamId }),
  });
}
