import { db } from "@/db";
import { teams, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTeamInvitationEmail, sendTeamMemberAddedEmail } from "@/lib/email";
import type { AssignableTeamRole } from "@/lib/team-roles";
import { asLocale, type Locale } from "@/lib/locale";

type TeamJoinEmailInput = {
  to: string;
  teamId: number;
  inviterUserId: number;
  role: AssignableTeamRole;
  /** 對方已有帳號（直接入隊）就寄「已加入」，否則寄註冊邀請 */
  hasAccount: boolean;
  /** 邀請人目前的介面語言。對方還沒有帳號、或帳號沒存過語言時，信就用這個語言寫 */
  inviterLocale: Locale;
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
  inviterLocale,
}: TeamJoinEmailInput): Promise<boolean> {
  try {
    const [[team], [inviter], [recipient]] = await Promise.all([
      db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1),
      db.select({ name: users.name }).from(users).where(eq(users.id, inviterUserId)).limit(1),
      hasAccount
        ? db.select({ locale: users.locale }).from(users).where(eq(users.email, to)).limit(1)
        : Promise.resolve([]),
    ]);
    if (!team) return false;

    const content = { teamName: team.name, inviterName: inviter?.name ?? null, role };
    const locale = recipient?.locale ? asLocale(recipient.locale) : inviterLocale;
    const result = hasAccount
      ? await sendTeamMemberAddedEmail(to, content, locale)
      : await sendTeamInvitationEmail(to, content, locale);
    return result.ok;
  } catch (err) {
    console.error("Team join email error:", err);
    return false;
  }
}
