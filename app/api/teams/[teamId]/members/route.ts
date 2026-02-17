import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, users, teamInvitations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and, asc, isNull } from "drizzle-orm";

type Params = { params: Promise<{ teamId: string }> };

/** 取得團隊成員列表（需為該團隊成員） */
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

  const members = await db
    .select({
      userId: teamMembers.userId,
      role: teamMembers.role,
      createdAt: teamMembers.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(teamMembers.createdAt));

  return NextResponse.json({ members });
}

/** 邀請新成員（需為該團隊成員） */
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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "請提供 email" }, { status: 400 });
  }

  // 檢查使用者是否存在
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    // 使用者已存在，直接加入團隊
    // 檢查是否已經是團隊成員
    const [existingMember] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
      .limit(1);

    if (existingMember) {
      return NextResponse.json({ error: "該使用者已經是團隊成員" }, { status: 409 });
    }

    // 檢查是否有待處理的邀請，有的話刪除
    await db
      .delete(teamInvitations)
      .where(and(eq(teamInvitations.teamId, teamId), eq(teamInvitations.email, email)));

    // 新增成員
    const [newMember] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: user.id,
        role: "member",
      })
      .returning();

    if (!newMember) {
      return NextResponse.json({ error: "新增失敗" }, { status: 500 });
    }

    return NextResponse.json({
      member: {
        userId: newMember.userId,
        role: newMember.role,
        createdAt: newMember.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } else {
    // 使用者不存在，建立邀請
    // 檢查是否已經有邀請
    const [existingInvitation] = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, teamId),
          eq(teamInvitations.email, email),
          isNull(teamInvitations.acceptedAt)
        )
      )
      .limit(1);

    if (existingInvitation) {
      return NextResponse.json({ error: "該 email 已有待處理的邀請" }, { status: 409 });
    }

    // 建立邀請
    const [invitation] = await db
      .insert(teamInvitations)
      .values({
        teamId,
        email,
        role: "member",
      })
      .returning();

    if (!invitation) {
      return NextResponse.json({ error: "建立邀請失敗" }, { status: 500 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
      },
    });
  }
}
