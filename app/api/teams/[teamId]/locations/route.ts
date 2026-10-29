import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventLocations, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { findUsingEvents } from "@/lib/saved-info-usage";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的活動地點列表 */
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
    .from(eventLocations)
    .where(eq(eventLocations.teamId, teamId));

  const usage = await findUsingEvents("location", list.map((row) => row.id));
  return NextResponse.json({
    locations: list.map((row) => ({ ...row, usedBy: usage.get(row.id) ?? [] })),
  });
}

/** 新增活動地點 */
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return apiError("apiErrors.savedInfo.nameRequired", 400);
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
    return apiError("apiErrors.common.addFailed", 500);
  }

  return NextResponse.json({ location });
}
