import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizers, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊的主辦單位列表 */
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
    .from(organizers)
    .where(eq(organizers.teamId, teamId));

  return NextResponse.json({ organizers: list });
}

/** 新增主辦單位 */
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

  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : null;
  const instagram = typeof body.instagram === "string" ? body.instagram : null;
  const facebook = typeof body.facebook === "string" ? body.facebook : null;

  const [organizer] = await db
    .insert(organizers)
    .values({
      teamId,
      name,
      photoUrl,
      instagram,
      facebook,
    })
    .returning();

  if (!organizer) {
    return apiError("apiErrors.common.addFailed", 500);
  }

  return NextResponse.json({ organizer });
}
