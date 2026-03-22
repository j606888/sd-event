import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventPurchaseItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; itemId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 更新購買項目（例如報名表是否顯示） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: eventIdStr, itemId: itemIdStr } = await params;
  const eventId = Number(eventIdStr);
  const itemId = Number(itemIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(itemId)) {
    return NextResponse.json({ error: "無效的 id" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "請提供 hidden（布林值）" }, { status: 400 });
  }

  const [updated] = await db
    .update(eventPurchaseItems)
    .set({ hidden: body.hidden, updatedAt: new Date() })
    .where(
      and(
        eq(eventPurchaseItems.id, itemId),
        eq(eventPurchaseItems.eventId, eventId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "找不到購買項目" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}
