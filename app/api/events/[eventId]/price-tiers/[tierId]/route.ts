import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventPriceTiers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { endOfDayFromDateInput } from "@/lib/pricing";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; tierId: string }> };


/** 更新票價時段（名稱 / 截止日 / 排序） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: eventIdStr, tierId: tierIdStr } = await params;
  const eventId = Number(eventIdStr);
  const tierId = Number(tierIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(tierId)) {
    return NextResponse.json({ error: "無效的 id" }, { status: 400 });
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const updates: {
    name?: string;
    endsAt?: Date | null;
    sortOrder?: number;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "時段名稱不可為空" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if ("endsAt" in body) {
    updates.endsAt = endOfDayFromDateInput(
      typeof body.endsAt === "string" ? body.endsAt : null
    );
  }
  if (Number.isInteger(body.sortOrder)) {
    updates.sortOrder = body.sortOrder;
  }

  const [updated] = await db
    .update(eventPriceTiers)
    .set(updates)
    .where(and(eq(eventPriceTiers.id, tierId), eq(eventPriceTiers.eventId, eventId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "找不到票價時段" }, { status: 404 });
  }

  return NextResponse.json({ priceTier: updated });
}

/** 刪除票價時段（連帶刪除各項目於該時段的列價，由 FK cascade 處理） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: eventIdStr, tierId: tierIdStr } = await params;
  const eventId = Number(eventIdStr);
  const tierId = Number(tierIdStr);
  if (!Number.isInteger(eventId) || !Number.isInteger(tierId)) {
    return NextResponse.json({ error: "無效的 id" }, { status: 400 });
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const [deleted] = await db
    .delete(eventPriceTiers)
    .where(and(eq(eventPriceTiers.id, tierId), eq(eventPriceTiers.eventId, eventId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "找不到票價時段" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
