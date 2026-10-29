import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminImpersonations } from "@/db/schema";
import {
  getSession,
  createToken,
  setAuthCookie,
  IMPERSONATION_TTL,
  IMPERSONATION_MAX_AGE_SECONDS,
} from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { eq } from "drizzle-orm";

/** 以指定使用者身分開始唯讀模擬檢視 */
export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const body = await request.json().catch(() => ({}));
  const userId = body?.userId;
  if (!Number.isInteger(userId)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "userId" });
  }

  if (userId === session.userId) {
    return apiError("apiErrors.admin.cannotImpersonateSelf", 400);
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const target = rows[0];

  if (!target) {
    return apiError("apiErrors.common.userNotFound", 404);
  }
  if (target.isSuperAdmin) {
    return apiError("apiErrors.admin.cannotImpersonateAdmin", 403);
  }

  const token = await createToken(
    { userId: target.id, email: target.email, impersonatorId: session.userId },
    IMPERSONATION_TTL
  );
  await setAuthCookie(token, IMPERSONATION_MAX_AGE_SECONDS);

  await db.insert(adminImpersonations).values({
    adminUserId: session.userId,
    targetUserId: target.id,
  });

  return NextResponse.json({
    ok: true,
    target: { id: target.id, name: target.name, email: target.email },
  });
}
