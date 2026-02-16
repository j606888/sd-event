import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizers, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的主辦單位列表 */
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
    .from(organizers)
    .where(eq(organizers.teamId, teamId));

  return NextResponse.json({ organizers: list });
}

/** 新增主辦單位 */
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "請提供名稱 name" }, { status: 400 });
  }

  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : null;
  const lineId = typeof body.lineId === "string" ? body.lineId : null;
  const instagram = typeof body.instagram === "string" ? body.instagram : null;
  const facebook = typeof body.facebook === "string" ? body.facebook : null;

  const [organizer] = await db
    .insert(organizers)
    .values({
      teamId,
      name,
      photoUrl,
      lineId,
      instagram,
      facebook,
    })
    .returning();

  if (!organizer) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ organizer });
}
