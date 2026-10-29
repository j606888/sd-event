import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventPurchaseItemGroups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { apiError } from "@/lib/api-error";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; groupId: string }> };


/** 更新票種群組（名稱 / 選擇模式 / 是否必填 / 排序） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { eventId: eventIdStr, groupId: groupIdStr } = await params;
  const eventId = Number(eventIdStr);
  const groupId = Number(groupIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(groupId)) {
    return apiError("eventApiErrors.invalidId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
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
      return apiError("eventApiErrors.purchaseItemGroups.titleEmpty", 400);
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
    return apiError("eventApiErrors.purchaseItemGroups.notFound", 404);
  }

  return NextResponse.json({ group: updated });
}

/** 刪除票種群組（底下項目的 groupId 由 FK set null 自動清空） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { eventId: eventIdStr, groupId: groupIdStr } = await params;
  const eventId = Number(eventIdStr);
  const groupId = Number(groupIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(groupId)) {
    return apiError("eventApiErrors.invalidId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
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
    return apiError("eventApiErrors.purchaseItemGroups.notFound", 404);
  }

  return NextResponse.json({ ok: true });
}
