import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankInfos, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的銀行資訊列表 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
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
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  if (!Number.isInteger(teamId)) {
    return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
  const bankCode = typeof body.bankCode === "string" ? body.bankCode.trim() : "";
  if (!bankName || !bankCode) {
    return NextResponse.json({ error: "請提供銀行名稱 bankName 與銀行代碼 bankCode" }, { status: 400 });
  }

  const account = typeof body.account === "string" ? body.account : null;

  const [bankInfo] = await db
    .insert(bankInfos)
    .values({
      teamId,
      bankName,
      bankCode,
      account,
    })
    .returning();

  if (!bankInfo) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ bankInfo });
}
