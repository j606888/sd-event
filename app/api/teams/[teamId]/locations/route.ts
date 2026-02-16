import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventLocations, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的活動地點列表 */
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
    .from(eventLocations)
    .where(eq(eventLocations.teamId, teamId));

  return NextResponse.json({ locations: list });
}

/** 新增活動地點 */
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

  const googleMapUrl = typeof body.googleMapUrl === "string" ? body.googleMapUrl : null;
  const address = typeof body.address === "string" ? body.address : null;
  const remark = typeof body.remark === "string" ? body.remark : null;

  const [location] = await db
    .insert(eventLocations)
    .values({
      teamId,
      name,
      googleMapUrl,
      address,
      remark,
    })
    .returning();

  if (!location) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ location });
}
