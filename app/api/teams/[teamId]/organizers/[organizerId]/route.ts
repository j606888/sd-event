import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizers, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; organizerId: string }>;
};

/** 更新主辦單位 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { teamId: teamIdStr, organizerId: organizerIdStr } = await params;
  const teamId = Number(teamIdStr);
  const organizerId = Number(organizerIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(organizerId)) {
    return NextResponse.json({ error: "無效的 teamId 或 organizerId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 organizer 屬於該 team
  const [existing] = await db
    .select()
    .from(organizers)
    .where(and(eq(organizers.id, organizerId), eq(organizers.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "找不到主辦單位" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    name: string;
    photoUrl: string | null;
    lineId: string | null;
    instagram: string | null;
    facebook: string | null;
  }> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.photoUrl !== undefined) {
    updates.photoUrl = body.photoUrl === null || body.photoUrl === "" ? null : String(body.photoUrl);
  }
  if (body.lineId !== undefined) {
    updates.lineId = body.lineId === null || body.lineId === "" ? null : String(body.lineId);
  }
  if (body.instagram !== undefined) {
    updates.instagram = body.instagram === null || body.instagram === "" ? null : String(body.instagram);
  }
  if (body.facebook !== undefined) {
    updates.facebook = body.facebook === null || body.facebook === "" ? null : String(body.facebook);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });
  }

  const [updated] = await db
    .update(organizers)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizers.id, organizerId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ organizer: updated });
}
