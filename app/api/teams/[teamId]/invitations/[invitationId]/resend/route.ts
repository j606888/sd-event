import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvitations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { isAssignableTeamRole } from "@/lib/team-roles";
import { sendTeamJoinEmail } from "@/lib/team-invitation-email";
import { apiError } from "@/lib/api-error";
import { getLocale } from "next-intl/server";
import { eq, and, isNull } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string; invitationId: string }> };

/** 重寄待處理邀請的邀請信（需為管理員） */
export async function POST(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdParam, invitationId: invitationIdParam } = await params;
  const teamId = Number(teamIdParam);
  const invitationId = Number(invitationIdParam);
  if (!Number.isInteger(teamId) || !Number.isInteger(invitationId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "invitationId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const [invitation] = await db
    .select()
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.id, invitationId),
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt)
      )
    )
    .limit(1);

  if (!invitation) {
    return apiError("apiErrors.invitations.notFound", 404);
  }

  const emailSent = await sendTeamJoinEmail({
    to: invitation.email,
    teamId,
    inviterUserId: session.userId,
    role: isAssignableTeamRole(invitation.role) ? invitation.role : "member",
    hasAccount: false,
    inviterLocale: await getLocale(),
  });

  if (!emailSent) {
    return apiError("apiErrors.invitations.resendFailed", 502);
  }
  return NextResponse.json({ emailSent });
}
