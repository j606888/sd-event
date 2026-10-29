import { NextResponse } from "next/server";
import { db } from "@/db";
import { linePayees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { lineIdInputError } from "@/lib/line";
import { apiError } from "@/lib/api-error";
import { findUsingEvents } from "@/lib/saved-info-usage";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的 LINE 付款好友列表 */
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
    .from(linePayees)
    .where(eq(linePayees.teamId, teamId));

  const usage = await findUsingEvents("linePayee", list.map((row) => row.id));
  return NextResponse.json({
    linePayees: list.map((row) => ({ ...row, usedBy: usage.get(row.id) ?? [] })),
  });
}

/** 新增 LINE 付款好友 */
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
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
  if (!label) {
    return apiError("apiErrors.savedInfo.linePayeeLabelRequired", 400);
  }
  const lineIdError = lineIdInputError(lineId);
  if (lineIdError) {
    return apiError(`savedInfo.linePayee.lineIdErrors.${lineIdError}`, 400);
  }

  const [linePayee] = await db
    .insert(linePayees)
    .values({ teamId, label, lineId })
    .returning();

  if (!linePayee) {
    return apiError("apiErrors.common.addFailed", 500);
  }

  return NextResponse.json({ linePayee });
}
