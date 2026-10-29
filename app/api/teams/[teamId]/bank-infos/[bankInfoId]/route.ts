import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankInfos, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { deleteSavedInfo } from "@/lib/saved-info-usage";
import { eq, and } from "drizzle-orm";

type Params = {
  params: Promise<{ teamId: string; bankInfoId: string }>;
};

/** 更新銀行資訊 */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdStr, bankInfoId: bankInfoIdStr } = await params;
  const teamId = Number(teamIdStr);
  const bankInfoId = Number(bankInfoIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(bankInfoId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "bankInfoId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  // 確認 bankInfo 屬於該 team
  const [existing] = await db
    .select()
    .from(bankInfos)
    .where(and(eq(bankInfos.id, bankInfoId), eq(bankInfos.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return apiError("apiErrors.savedInfo.bankInfoNotFound", 404);
  }

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    label: string | null;
    bankName: string;
    bankCode: string;
    account: string | null;
  }> = {};

  if (body.label !== undefined) {
    updates.label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
  }
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
    return apiError("apiErrors.common.noFieldsToUpdate", 400);
  }

  const [updated] = await db
    .update(bankInfos)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(bankInfos.id, bankInfoId))
    .returning();

  if (!updated) {
    return apiError("apiErrors.common.updateFailed", 500);
  }

  return NextResponse.json({ bankInfo: updated });
}

/** 刪除銀行資訊；用到它的活動會清空這個欄位（外鍵 set null） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { teamId: teamIdStr, bankInfoId: bankInfoIdStr } = await params;
  const teamId = Number(teamIdStr);
  const bankInfoId = Number(bankInfoIdStr);

  if (!Number.isInteger(teamId) || !Number.isInteger(bankInfoId)) {
    return apiError("apiErrors.common.invalidParamPair", 400, {
      first: "teamId",
      second: "bankInfoId",
    });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  return deleteSavedInfo("bankInfo", teamId, bankInfoId);
}
