import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, teams, teamMembers } from "@/db/schema";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
      return NextResponse.json(
        { error: "請提供有效的 name、email（格式正確）與 password（至少 6 字）" },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "此信箱已被註冊" },
        { status: 409 }
      );
    }

    const encryptedPassword = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        encryptedPassword,
      })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    if (!user) {
      return NextResponse.json({ error: "註冊失敗" }, { status: 500 });
    }

    // 建立預設團隊並將使用者設為 owner
    const [team] = await db
      .insert(teams)
      .values({ name: "我的團隊" })
      .returning({ id: teams.id });
    if (team) {
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });
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
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
