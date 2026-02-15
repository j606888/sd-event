import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { eq } from "drizzle-orm";

const loginSchema = {
  email: (v: unknown) => typeof v === "string" && v.length > 0,
  password: (v: unknown) => typeof v === "string" && v.length >= 6,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!loginSchema.email(email) || !loginSchema.password(password)) {
      return NextResponse.json(
        { error: "請提供有效的 email 與 password（至少 6 字）" },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        encryptedPassword: users.encryptedPassword,
      })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "信箱或密碼錯誤" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.encryptedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "信箱或密碼錯誤" },
        { status: 401 }
      );
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
    console.error("Login error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
