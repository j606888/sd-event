import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type Session = { userId: number; email: string };

/** 取得當前 session，未登入回傳 null */
export async function requireSession(): Promise<Session | null> {
  return getSession();
}

/** 未登入時回傳 401 Response，登入則回傳 null（表示可繼續） */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入或登入已過期" }, { status: 401 });
  }
  return null;
}

/** 檢查是否為該團隊成員；若不是則回傳 403 Response */
export async function requireTeamMember(
  teamId: number,
  userId: number
): Promise<NextResponse | null> {
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "無權限操作此團隊" }, { status: 403 });
  }
  return null;
}
