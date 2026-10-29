import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { isLocale } from "@/lib/locale";
import { eq } from "drizzle-orm";

/**
 * 記下使用者切換的介面語言，之後寄給他的通知信（新報名、團隊邀請）就用這個語言。
 * 畫面本身靠 NEXT_LOCALE cookie，這裡只是同步一份到 DB。
 */
export async function PUT(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const body = await request.json().catch(() => ({}));
  if (!isLocale(body.locale)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "locale" });
  }

  await db.update(users).set({ locale: body.locale }).where(eq(users.id, session.userId));

  return NextResponse.json({ locale: body.locale });
}
