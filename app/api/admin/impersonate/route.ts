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
import { eq } from "drizzle-orm";

/** 以指定使用者身分開始唯讀模擬檢視 */
export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const userId = body?.userId;
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "無效的 userId" }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json({ error: "無法模擬自己" }, { status: 400 });
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
    return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "無法模擬其他總管理員" },
      { status: 403 }
    );
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
