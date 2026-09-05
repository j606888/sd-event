import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isTeamAdmin, type TeamRole } from "@/lib/team-roles";

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

/** 取得使用者在該團隊的角色；非成員回傳 null */
export async function getTeamRole(
  teamId: number,
  userId: number
): Promise<TeamRole | null> {
  const rows = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  return rows[0]?.role ?? null;
}

/**
 * 檢查是否為該團隊成員（含驗票人員）；若不是則回傳 403 Response。
 * 只用於驗票人員也該能用的功能：報到、報名名單、現場報名。
 * 其他一律用 requireTeamAdmin。
 */
export async function requireTeamMember(
  teamId: number,
  userId: number
): Promise<NextResponse | null> {
  const role = await getTeamRole(teamId, userId);
  if (!role) {
    return NextResponse.json({ error: "無權限操作此團隊" }, { status: 403 });
  }
  return null;
}

/** 要求為該團隊的管理員；驗票人員一律 403 */
export async function requireTeamAdmin(
  teamId: number,
  userId: number
): Promise<NextResponse | null> {
  const role = await getTeamRole(teamId, userId);
  if (!role) {
    return NextResponse.json({ error: "無權限操作此團隊" }, { status: 403 });
  }
  if (!isTeamAdmin(role)) {
    return NextResponse.json({ error: "此功能僅限管理員" }, { status: 403 });
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
