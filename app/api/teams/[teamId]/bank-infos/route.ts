import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankInfos, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的銀行資訊列表 */
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

  const list = await db
    .select()
    .from(bankInfos)
    .where(eq(bankInfos.teamId, teamId));

  return NextResponse.json({ bankInfos: list });
}

/** 新增銀行資訊 */
export async function POST(request: Request, { params }: Params) {
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

  const body = await request.json().catch(() => ({}));
  const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
  const bankCode = typeof body.bankCode === "string" ? body.bankCode.trim() : "";
  if (!bankName || !bankCode) {
    return apiError("apiErrors.savedInfo.bankInfoRequired", 400);
  }

  const account = typeof body.account === "string" ? body.account : null;
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;

  const [bankInfo] = await db
    .insert(bankInfos)
    .values({
      teamId,
      label,
      bankName,
      bankCode,
      account,
    })
    .returning();

  if (!bankInfo) {
    return apiError("apiErrors.common.addFailed", 500);
  }

  return NextResponse.json({ bankInfo });
}
