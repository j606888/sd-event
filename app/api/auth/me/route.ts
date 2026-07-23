import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "未登入或登入已過期" },
        { status: 401 }
      );
    }

    const impersonatorId = session.impersonatorId;
    const ids =
      typeof impersonatorId === "number"
        ? [session.userId, impersonatorId]
        : [session.userId];

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        activeTeamId: users.activeTeamId,
        isSuperAdmin: users.isSuperAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.id, ids));

    const user = rows.find((r) => r.id === session.userId);

    if (!user) {
      return NextResponse.json(
        { error: "找不到使用者" },
        { status: 404 }
      );
    }

    const admin =
      typeof impersonatorId === "number"
        ? rows.find((r) => r.id === impersonatorId)
        : undefined;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        activeTeamId: user.activeTeamId,
        // 模擬檢視中不揭露被模擬者的管理權限，避免前端顯示總管理入口
        isSuperAdmin: admin ? false : user.isSuperAdmin,
        createdAt: user.createdAt,
      },
      /** 有值 = 目前為總管理員唯讀模擬檢視 */
      impersonation: admin
        ? {
            adminName: admin.name,
            adminEmail: admin.email,
            targetName: user.name,
            targetEmail: user.email,
          }
        : null,
    });
  } catch (e) {
    console.error("Me error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
