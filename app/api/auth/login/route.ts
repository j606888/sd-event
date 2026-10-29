import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { getLocale } from "next-intl/server";
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
      return apiError("apiErrors.auth.invalidLoginInput", 400);
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
      return apiError("apiErrors.auth.emailNotRegistered", 401);
    }

    const ok = await verifyPassword(password, user.encryptedPassword);
    if (!ok) {
      return apiError("apiErrors.auth.wrongPassword", 401);
    }

    await db
      .update(users)
      // 順便記下目前的介面語言，寄給他的通知信（新報名、團隊邀請）就用這個語言
      .set({ lastLoginAt: new Date(), locale: await getLocale() })
      .where(eq(users.id, user.id));

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
    return apiError("apiErrors.common.serverError", 500);
  }
}
