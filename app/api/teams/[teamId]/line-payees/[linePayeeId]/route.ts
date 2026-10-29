import { NextResponse } from "next/server";
import { db } from "@/db";
import { linePayees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { lineIdInputError } from "@/lib/line";
import { apiError } from "@/lib/api-error";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; linePayeeId: string }>;
};

/** 更新 LINE 付款好友 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdStr, linePayeeId: linePayeeIdStr } = await params;
  const teamId = Number(teamIdStr);
  const linePayeeId = Number(linePayeeIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(linePayeeId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "linePayeeId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 linePayee 屬於該 team
  const [existing] = await db
    .select()
    .from(linePayees)
    .where(and(eq(linePayees.id, linePayeeId), eq(linePayees.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return apiError("apiErrors.savedInfo.linePayeeNotFound", 404);
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{ label: string; lineId: string }> = {};

  if (typeof body.label === "string" && body.label.trim()) {
    updates.label = body.label.trim();
  }
  if (typeof body.lineId === "string") {
    const lineIdError = lineIdInputError(body.lineId);
    if (lineIdError) {
      return apiError(`savedInfo.linePayee.lineIdErrors.${lineIdError}`, 400);
    }
    updates.lineId = body.lineId.trim();
  }

  if (Object.keys(updates).length === 0) {
    return apiError("apiErrors.common.noFieldsToUpdate", 400);
  }

  const [updated] = await db
    .update(linePayees)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(linePayees.id, linePayeeId))
    .returning();

  if (!updated) {
    return apiError("apiErrors.common.updateFailed", 500);
  }

  return NextResponse.json({ linePayee: updated });
}
