import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { isAssignableTeamRole, isTeamAdmin, type AssignableTeamRole } from "@/lib/team-roles";
import { and, count, eq, inArray } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string; userId: string }> };

/** 移除團隊成員（需為管理員；不能移除自己，也不能移除團隊擁有者） */
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

  const forbidden = await requireTeamAdmin(teamId, session.userId);
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

  // 擁有者是團隊的最後一道鎖，其他管理員不能把他踢掉
  if (member.role === "owner") {
    return NextResponse.json({ error: "不能移除團隊擁有者" }, { status: 403 });
  }

  // 移除成員
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  return NextResponse.json({ success: true });
}

/**
 * 更新成員設定（需為管理員）：
 * - `role`：在管理員 ⇄ 驗票人員之間切換
 * - `notifyOnRegistration`：新報名通知信開關，只有管理員能開啟
 */
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

  const forbidden = await requireTeamAdmin(teamId, session.userId);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));

  if (body.role != null && !isAssignableTeamRole(body.role)) {
    return NextResponse.json(
      { error: "請提供有效的 role (member 或 staff)" },
      { status: 400 }
    );
  }
  if (body.notifyOnRegistration != null && typeof body.notifyOnRegistration !== "boolean") {
    return NextResponse.json(
      { error: "notifyOnRegistration 必須是 true 或 false" },
      { status: 400 }
    );
  }

  // 只能在「管理員（member）」與「驗票人員（staff）」之間切換；owner 不可指派
  const role: AssignableTeamRole | null = isAssignableTeamRole(body.role) ? body.role : null;
  const notifyOnRegistration: boolean | null =
    typeof body.notifyOnRegistration === "boolean" ? body.notifyOnRegistration : null;

  if (role === null && notifyOnRegistration === null) {
    return NextResponse.json(
      { error: "請提供 role 或 notifyOnRegistration" },
      { status: 400 }
    );
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

  const updates: { role?: AssignableTeamRole; notifyOnRegistration?: boolean } = {};

  if (role !== null && role !== member.role) {
    // 擁有者的角色不能被其他管理員改掉（通知開關則可以）
    if (member.role === "owner") {
      return NextResponse.json({ error: "不能變更團隊擁有者的角色" }, { status: 403 });
    }

    // 不能把最後一位管理員降成驗票人員，否則團隊就沒人管得動了
    if (isTeamAdmin(member.role) && !isTeamAdmin(role)) {
      const [{ admins }] = await db
        .select({ admins: count() })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            inArray(teamMembers.role, ["owner", "member"])
          )
        );
      if (Number(admins) <= 1) {
        return NextResponse.json(
          { error: "團隊至少要保留一位管理員" },
          { status: 400 }
        );
      }
    }

    updates.role = role;
  }

  const effectiveRole = updates.role ?? member.role;

  if (notifyOnRegistration === true && !isTeamAdmin(effectiveRole)) {
    return NextResponse.json(
      { error: "只有管理員可以接收報名通知信" },
      { status: 400 }
    );
  }
  if (notifyOnRegistration !== null) {
    updates.notifyOnRegistration = notifyOnRegistration;
  }
  // 驗票人員看不到金額，降級時一併關掉通知信
  if (!isTeamAdmin(effectiveRole)) {
    updates.notifyOnRegistration = false;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ member });
  }

  const [updated] = await db
    .update(teamMembers)
    .set(updates)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ member: updated });
}
