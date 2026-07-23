import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type Session = { userId: number; email: string; impersonatorId?: number };

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

/** 目前是否為總管理員的模擬檢視 session（唯讀） */
export function isImpersonating(session: Session | null): boolean {
  return typeof session?.impersonatorId === "number";
}

/**
 * 要求「本人」為總管理員；模擬檢視中的 session 一律拒絕
 * （模擬中要回總後台必須先結束模擬）。
 * 通過回傳 null，否則回傳 401/403 Response。
 */
export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入或登入已過期" }, { status: 401 });
  }
  if (isImpersonating(session)) {
    return NextResponse.json(
      { error: "模擬檢視中無法使用總管理功能，請先結束模擬" },
      { status: 403 }
    );
  }
  const ok = await isSuperAdminUser(session.userId);
  if (!ok) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }
  return null;
}

/** 查使用者是否為總管理員（DB 為唯一真實來源，不放在 token 內） */
export async function isSuperAdminUser(userId: number): Promise<boolean> {
  const rows = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.isSuperAdmin === true;
}
