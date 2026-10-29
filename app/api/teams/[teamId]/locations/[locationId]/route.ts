import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventLocations, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; locationId: string }>;
};

/** 更新活動地點 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdStr, locationId: locationIdStr } = await params;
  const teamId = Number(teamIdStr);
  const locationId = Number(locationIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(locationId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "locationId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 location 屬於該 team
  const [existing] = await db
    .select()
    .from(eventLocations)
    .where(and(eq(eventLocations.id, locationId), eq(eventLocations.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return apiError("apiErrors.savedInfo.locationNotFound", 404);
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    name: string;
    googleMapUrl: string | null;
    address: string | null;
    remark: string | null;
  }> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.googleMapUrl !== undefined) {
    updates.googleMapUrl = body.googleMapUrl === null || body.googleMapUrl === "" ? null : String(body.googleMapUrl);
  }
  if (body.address !== undefined) {
    updates.address = body.address === null || body.address === "" ? null : String(body.address);
  }
  if (body.remark !== undefined) {
    updates.remark = body.remark === null || body.remark === "" ? null : String(body.remark);
  }

  if (Object.keys(updates).length === 0) {
    return apiError("apiErrors.common.noFieldsToUpdate", 400);
  }

  const [updated] = await db
    .update(eventLocations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(eventLocations.id, locationId))
    .returning();

  if (!updated) {
    return apiError("apiErrors.common.updateFailed", 500);
  }

  return NextResponse.json({ location: updated });
}
