import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizers, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; organizerId: string }>;
};

/** 更新主辦單位 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdStr, organizerId: organizerIdStr } = await params;
  const teamId = Number(teamIdStr);
  const organizerId = Number(organizerIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(organizerId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "organizerId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 organizer 屬於該 team
  const [existing] = await db
    .select()
    .from(organizers)
    .where(and(eq(organizers.id, organizerId), eq(organizers.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return apiError("apiErrors.savedInfo.organizerNotFound", 404);
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    name: string;
    photoUrl: string | null;
    instagram: string | null;
    facebook: string | null;
  }> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.photoUrl !== undefined) {
    updates.photoUrl = body.photoUrl === null || body.photoUrl === "" ? null : String(body.photoUrl);
  }
  if (body.instagram !== undefined) {
    updates.instagram = body.instagram === null || body.instagram === "" ? null : String(body.instagram);
  }
  if (body.facebook !== undefined) {
    updates.facebook = body.facebook === null || body.facebook === "" ? null : String(body.facebook);
  }

  if (Object.keys(updates).length === 0) {
    return apiError("apiErrors.common.noFieldsToUpdate", 400);
  }

  const [updated] = await db
    .update(organizers)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizers.id, organizerId))
    .returning();

  if (!updated) {
    return apiError("apiErrors.common.updateFailed", 500);
  }

  return NextResponse.json({ organizer: updated });
}
