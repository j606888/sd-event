import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventLocations, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; locationId: string }>;
};

/** 更新活動地點 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { teamId: teamIdStr, locationId: locationIdStr } = await params;
  const teamId = Number(teamIdStr);
  const locationId = Number(locationIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(locationId)) {
    return NextResponse.json({ error: "無效的 teamId 或 locationId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 location 屬於該 team
  const [existing] = await db
    .select()
    .from(eventLocations)
    .where(and(eq(eventLocations.id, locationId), eq(eventLocations.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "找不到活動地點" }, { status: 404 });
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
    return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });
  }

  const [updated] = await db
    .update(eventLocations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(eventLocations.id, locationId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ location: updated });
}
