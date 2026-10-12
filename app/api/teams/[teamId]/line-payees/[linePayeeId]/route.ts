import { NextResponse } from "next/server";
import { db } from "@/db";
import { linePayees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { validateLineIdInput } from "@/lib/line";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; linePayeeId: string }>;
};

/** 更新 LINE 付款好友 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { teamId: teamIdStr, linePayeeId: linePayeeIdStr } = await params;
  const teamId = Number(teamIdStr);
  const linePayeeId = Number(linePayeeIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(linePayeeId)) {
    return NextResponse.json({ error: "無效的 teamId 或 linePayeeId" }, { status: 400 });
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
    return NextResponse.json({ error: "找不到 LINE 付款好友" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{ label: string; lineId: string }> = {};

  if (typeof body.label === "string" && body.label.trim()) {
    updates.label = body.label.trim();
  }
  if (typeof body.lineId === "string") {
    const lineIdError = validateLineIdInput(body.lineId);
    if (lineIdError) {
      return NextResponse.json({ error: lineIdError }, { status: 400 });
    }
    updates.lineId = body.lineId.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });
  }

  const [updated] = await db
    .update(linePayees)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(linePayees.id, linePayeeId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ linePayee: updated });
}
