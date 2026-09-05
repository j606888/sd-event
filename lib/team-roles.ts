/**
 * 團隊成員角色。
 *
 * 對使用者只呈現兩種身分：「管理員」與「驗票人員」。
 * `owner` 與 `member` 都是管理員，差別只在 owner 是團隊建立者，
 * 不能被其他管理員移除或降級 —— 這是防止團隊被鎖死的安全鎖，不是第三種角色。
 */
export type TeamRole = "owner" | "member" | "staff";

/** 可指派給他人的角色（不能直接把別人設成 owner） */
export const ASSIGNABLE_TEAM_ROLES = ["member", "staff"] as const;
export type AssignableTeamRole = (typeof ASSIGNABLE_TEAM_ROLES)[number];

export function isTeamAdmin(role: TeamRole | null | undefined): boolean {
  return role === "owner" || role === "member";
}

export function isAssignableTeamRole(value: unknown): value is AssignableTeamRole {
  return (ASSIGNABLE_TEAM_ROLES as readonly string[]).includes(value as string);
}

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  owner: "管理員",
  member: "管理員",
  staff: "驗票人員",
};

export const TEAM_ROLE_DESCRIPTION: Record<AssignableTeamRole, string> = {
  member: "可管理活動、報名者、款項與團隊成員",
  staff: "只能掃碼報到與現場報名，看不到金額與營收",
};
