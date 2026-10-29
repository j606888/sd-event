import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq } from "drizzle-orm";

/** 取得當前使用者的活躍團隊 */
export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const userRows = await db
    .select({
      activeTeamId: users.activeTeamId,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    return apiError("apiErrors.common.userNotFound", 404);
  }

  return NextResponse.json({ activeTeamId: user.activeTeamId });
}

/** 更新當前使用者的活躍團隊 */
export async function PATCH(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const body = await request.json().catch(() => ({}));
  const teamId = body.teamId != null ? Number(body.teamId) : null;

  // If teamId is provided, validate it
  if (teamId != null) {
    if (!Number.isInteger(teamId)) {
      return apiError("apiErrors.common.invalidParam", 400, { param: "teamId" });
    }
    // Verify user is a member of this team
    const forbidden = await requireTeamMember(teamId, session.userId);
    if (forbidden) return forbidden;
  }

  // Update active team
  await db
    .update(users)
    .set({ activeTeamId: teamId })
    .where(eq(users.id, session.userId));

  return NextResponse.json({ activeTeamId: teamId });
}
