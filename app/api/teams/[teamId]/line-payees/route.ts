import { NextResponse } from "next/server";
import { db } from "@/db";
import { linePayees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { validateLineIdInput } from "@/lib/line";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的 LINE 付款好友列表 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const list = await db
    .select()
    .from(linePayees)
    .where(eq(linePayees.teamId, teamId));

  return NextResponse.json({ linePayees: list });
}

/** 新增 LINE 付款好友 */
export async function POST(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
  }

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "請提供名稱／備註 label" }, { status: 400 });
  }
  const lineIdError = validateLineIdInput(lineId);
  if (lineIdError) {
    return NextResponse.json({ error: lineIdError }, { status: 400 });
  }

  const [linePayee] = await db
    .insert(linePayees)
    .values({ teamId, label, lineId })
    .returning();

  if (!linePayee) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ linePayee });
}
