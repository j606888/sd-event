import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankInfos, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; bankInfoId: string }>;
};

/** 更新銀行資訊 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { teamId: teamIdStr, bankInfoId: bankInfoIdStr } = await params;
  const teamId = Number(teamIdStr);
  const bankInfoId = Number(bankInfoIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(bankInfoId)) {
    return NextResponse.json({ error: "無效的 teamId 或 bankInfoId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 bankInfo 屬於該 team
  const [existing] = await db
    .select()
    .from(bankInfos)
    .where(and(eq(bankInfos.id, bankInfoId), eq(bankInfos.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "找不到銀行資訊" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    bankName: string;
    bankCode: string;
    account: string | null;
  }> = {};

  if (typeof body.bankName === "string" && body.bankName.trim()) {
    updates.bankName = body.bankName.trim();
  }
  if (typeof body.bankCode === "string" && body.bankCode.trim()) {
    updates.bankCode = body.bankCode.trim();
  }
  if (body.account !== undefined) {
    updates.account = body.account === null || body.account === "" ? null : String(body.account);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });
  }

  const [updated] = await db
    .update(bankInfos)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(bankInfos.id, bankInfoId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ bankInfo: updated });
}
