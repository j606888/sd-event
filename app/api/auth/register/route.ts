import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teams, teamMembers, teamInvitations } from "@/db/schema";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { apiError, apiMessage } from "@/lib/api-error";
import { getLocale } from "next-intl/server";
import { eq, and, isNull } from "drizzle-orm";

const registerSchema = {
  name: (v: unknown) => typeof v === "string" && v.length >= 2,
  email: (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  password: (v: unknown) => typeof v === "string" && v.length >= 6,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (
      !registerSchema.name(name) ||
      !registerSchema.email(email) ||
      !registerSchema.password(password)
    ) {
      return apiError("apiErrors.auth.invalidRegisterInput", 400);
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      return apiError("apiErrors.auth.emailTaken", 409);
    }

    const encryptedPassword = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        encryptedPassword,
        locale: await getLocale(),
      })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    if (!user) {
      return apiError("apiErrors.auth.registerFailed", 500);
    }

    // 檢查是否有待處理的團隊邀請
    const pendingInvitations = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.email, user.email),
          isNull(teamInvitations.acceptedAt)
        )
      );

    // 處理所有待處理的邀請
    if (pendingInvitations.length > 0) {
      for (const invitation of pendingInvitations) {
        // 檢查是否已經是團隊成員（避免重複）
        const [existingMember] = await db
          .select()
          .from(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, invitation.teamId),
              eq(teamMembers.userId, user.id)
            )
          )
          .limit(1);

        if (!existingMember) {
          // 加入團隊
          await db.insert(teamMembers).values({
            teamId: invitation.teamId,
            userId: user.id,
            role: invitation.role,
          });
        }

        // 標記邀請為已接受
        await db
          .update(teamInvitations)
          .set({ acceptedAt: new Date() })
          .where(eq(teamInvitations.id, invitation.id));
      }
    }

    // 如果沒有待處理的邀請，建立預設團隊並將使用者設為 owner
    let defaultTeamId: number | null = null;
    if (pendingInvitations.length === 0) {
      const [team] = await db
        .insert(teams)
        // 預設團隊名稱用註冊當下的介面語言，之後可在團隊頁改名
        .values({ name: await apiMessage("team.defaultName") })
        .returning({ id: teams.id });
      if (team) {
        defaultTeamId = team.id;
        await db.insert(teamMembers).values({
          teamId: team.id,
          userId: user.id,
          role: "owner",
        });
      }
    } else {
      // If there are invitations, use the first team they joined
      defaultTeamId = pendingInvitations[0].teamId;
    }

    // Set active team
    if (defaultTeamId != null) {
      await db
        .update(users)
        .set({ activeTeamId: defaultTeamId })
        .where(eq(users.id, user.id));
    }

    const token = await createToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("Register error:", e);
    return apiError("apiErrors.common.serverError", 500);
  }
}
