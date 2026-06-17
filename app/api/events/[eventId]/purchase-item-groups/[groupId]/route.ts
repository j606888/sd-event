import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventPurchaseItemGroups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; groupId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 更新票種群組（名稱 / 選擇模式 / 是否必填 / 排序） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: eventIdStr, groupId: groupIdStr } = await params;
  const eventId = Number(eventIdStr);
  const groupId = Number(groupIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(groupId)) {
    return NextResponse.json({ error: "無效的 id" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const updates: {
    title?: string;
    selectionMode?: string;
    required?: boolean;
    sortOrder?: number;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "群組名稱不可為空" }, { status: 400 });
    }
    updates.title = trimmed;
  }
  if (body.selectionMode === "single" || body.selectionMode === "multiple") {
    updates.selectionMode = body.selectionMode;
  }
  if (typeof body.required === "boolean") {
    updates.required = body.required;
  }
  if (Number.isInteger(body.sortOrder)) {
    updates.sortOrder = body.sortOrder;
  }

  const [updated] = await db
    .update(eventPurchaseItemGroups)
    .set(updates)
    .where(
      and(
        eq(eventPurchaseItemGroups.id, groupId),
        eq(eventPurchaseItemGroups.eventId, eventId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "找不到票種群組" }, { status: 404 });
  }

  return NextResponse.json({ group: updated });
}

/** 刪除票種群組（底下項目的 groupId 由 FK set null 自動清空） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: eventIdStr, groupId: groupIdStr } = await params;
  const eventId = Number(eventIdStr);
  const groupId = Number(groupIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(groupId)) {
    return NextResponse.json({ error: "無效的 id" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
  if ("error" in access) return access.error;

  const [deleted] = await db
    .delete(eventPurchaseItemGroups)
    .where(
      and(
        eq(eventPurchaseItemGroups.id, groupId),
        eq(eventPurchaseItemGroups.eventId, eventId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "找不到票種群組" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
