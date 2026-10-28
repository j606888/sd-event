import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvitations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { isAssignableTeamRole } from "@/lib/team-roles";
import { sendTeamJoinEmail } from "@/lib/team-invitation-email";
import { eq, and, isNull } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string; invitationId: string }> };

/** 重寄待處理邀請的邀請信（需為管理員） */
export async function POST(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { teamId: teamIdParam, invitationId: invitationIdParam } = await params;
  const teamId = Number(teamIdParam);
  const invitationId = Number(invitationIdParam);
  if (!Number.isInteger(teamId) || !Number.isInteger(invitationId)) {
    return NextResponse.json({ error: "無效的 teamId 或 invitationId" }, { status: 400 });
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
    return NextResponse.json({ error: "找不到這筆待處理邀請" }, { status: 404 });
  }

  const emailSent = await sendTeamJoinEmail({
    to: invitation.email,
    teamId,
    inviterUserId: session.userId,
    role: isAssignableTeamRole(invitation.role) ? invitation.role : "member",
    hasAccount: false,
  });

  if (!emailSent) {
    return NextResponse.json({ error: "邀請信寄送失敗，請稍後再試" }, { status: 502 });
  }
  return NextResponse.json({ emailSent });
}
