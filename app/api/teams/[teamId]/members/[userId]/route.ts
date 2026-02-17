import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string; userId: string }> };

/** 移除團隊成員（需為該團隊成員，且不能移除自己） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  const userId = Number((await params).userId);

  if (!Number.isInteger(teamId) || !Number.isInteger(userId)) {
    return NextResponse.json({ error: "無效的 teamId 或 userId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  // 不能移除自己
  if (userId === session.userId) {
    return NextResponse.json({ error: "不能移除自己" }, { status: 400 });
  }

  // 檢查要移除的成員是否存在
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: "找不到該成員" }, { status: 404 });
  }

  // 移除成員
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  return NextResponse.json({ success: true });
}

/** 更新成員角色（需為該團隊成員，且只有 owner 可以更新角色） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const teamId = Number((await params).teamId);
  const userId = Number((await params).userId);

  if (!Number.isInteger(teamId) || !Number.isInteger(userId)) {
    return NextResponse.json({ error: "無效的 teamId 或 userId" }, { status: 400 });
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  // 檢查當前使用者是否為 owner
  const [currentMember] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.userId)))
    .limit(1);

  if (currentMember?.role !== "owner") {
    return NextResponse.json({ error: "只有團隊擁有者可以更新成員角色" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const role = typeof body.role === "string" && ["owner", "member"].includes(body.role)
    ? body.role
    : null;

  if (!role) {
    return NextResponse.json({ error: "請提供有效的 role (owner 或 member)" }, { status: 400 });
  }

  // 檢查要更新的成員是否存在
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: "找不到該成員" }, { status: 404 });
  }

  // 更新角色
  const [updated] = await db
    .update(teamMembers)
    .set({ role })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ member: updated });
}
