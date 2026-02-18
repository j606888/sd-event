import { NextResponse } from "next/server";
import { db } from "@/db";
import { teams, teamMembers, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

/** 取得當前使用者所屬團隊列表 */
export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const list = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, session.userId));

  return NextResponse.json({ teams: list });
}

/** 建立新團隊 */
export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "請提供團隊名稱 name" }, { status: 400 });
  }

  const [team] = await db
    .insert(teams)
    .values({ name })
    .returning({ id: teams.id, name: teams.name, createdAt: teams.createdAt });

  if (!team) {
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: session.userId,
    role: "owner",
  });

  // Set this as the active team (always set newly created team as active)
  await db
    .update(users)
    .set({ activeTeamId: team.id })
    .where(eq(users.id, session.userId));

  return NextResponse.json({ team });
}
