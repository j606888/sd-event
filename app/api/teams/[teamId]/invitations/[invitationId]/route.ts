import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvitations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq, and, isNull } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string; invitationId: string }> };

/** 撤回待處理的邀請（需為管理員）；對方之後用這個信箱註冊不會再自動加入團隊 */
export async function DELETE(_request: Request, { params }: Params) {
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

  const [deleted] = await db
    .delete(teamInvitations)
    .where(
      and(
        eq(teamInvitations.id, invitationId),
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt)
      )
    )
    .returning({ id: teamInvitations.id });

  if (!deleted) {
    return apiError("apiErrors.invitations.notFound", 404);
  }
  return NextResponse.json({ ok: true });
}
