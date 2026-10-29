import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamInvitations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq, and, isNull, asc } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的待處理邀請列表（需為該團隊成員） */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "teamId" });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const invitations = await db
    .select()
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt)
      )
    )
    .orderBy(asc(teamInvitations.createdAt));

  return NextResponse.json({ invitations });
}
