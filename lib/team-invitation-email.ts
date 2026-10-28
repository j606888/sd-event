import { db } from "@/db";
import { teams, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTeamInvitationEmail, sendTeamMemberAddedEmail } from "@/lib/email";
import type { AssignableTeamRole } from "@/lib/team-roles";

type TeamJoinEmailInput = {
  to: string;
  teamId: number;
  inviterUserId: number;
  role: AssignableTeamRole;
  /** 對方已有帳號（直接入隊）就寄「已加入」，否則寄註冊邀請 */
  hasAccount: boolean;
};

/**
 * 邀請成員後寄信給對方。不會 throw，回傳是否寄出，讓畫面能提示「信沒寄出去」。
 */
export async function sendTeamJoinEmail({
  to,
  teamId,
  inviterUserId,
  role,
  hasAccount,
}: TeamJoinEmailInput): Promise<boolean> {
  try {
    const [[team], [inviter]] = await Promise.all([
      db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1),
      db.select({ name: users.name }).from(users).where(eq(users.id, inviterUserId)).limit(1),
    ]);
    if (!team) return false;

    const content = { teamName: team.name, inviterName: inviter?.name ?? "團隊管理員", role };
    const result = hasAccount
      ? await sendTeamMemberAddedEmail(to, content)
      : await sendTeamInvitationEmail(to, content);
    return result.ok;
  } catch (err) {
    console.error("Team join email error:", err);
    return false;
  }
}
