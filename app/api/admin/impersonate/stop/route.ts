import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminImpersonations } from "@/db/schema";
import { getSession, createToken, setAuthCookie } from "@/lib/auth";
import { and, desc, eq, isNull } from "drizzle-orm";

/** 結束模擬檢視，換回管理員本人的一般 session */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登入或登入已過期" }, { status: 401 });
  }

  const adminId = session.impersonatorId;
  if (typeof adminId !== "number") {
    return NextResponse.json({ error: "目前不在模擬檢視中" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);
  const admin = rows[0];

  if (!admin || !admin.isSuperAdmin) {
    // 管理員權限已被移除或帳號不存在 → 直接視為無效 session
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  // 標記稽核記錄結束（找該管理員對此使用者最近一筆未結束的紀錄）
  const openRows = await db
    .select({ id: adminImpersonations.id })
    .from(adminImpersonations)
    .where(
      and(
        eq(adminImpersonations.adminUserId, adminId),
        eq(adminImpersonations.targetUserId, session.userId),
        isNull(adminImpersonations.endedAt)
      )
    )
    .orderBy(desc(adminImpersonations.startedAt))
    .limit(1);

  if (openRows[0]) {
    await db
      .update(adminImpersonations)
      .set({ endedAt: new Date() })
      .where(eq(adminImpersonations.id, openRows[0].id));
  }

  const token = await createToken({ userId: admin.id, email: admin.email });
  await setAuthCookie(token);

  return NextResponse.json({ ok: true });
}
