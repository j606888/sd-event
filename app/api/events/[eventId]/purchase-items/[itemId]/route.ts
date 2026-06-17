import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventPurchaseItems,
  eventPurchaseItemPrices,
  eventRegistrations,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { and, eq, sql } from "drizzle-orm";

/** 計算某購買項目目前綁定的「未隱藏」報名數（新模式 + 舊單選模式合計） */
async function countActiveRegistrations(eventId: number, itemId: number) {
  const [multi] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(eventRegistrationPurchaseItems)
    .innerJoin(
      eventRegistrations,
      eq(eventRegistrationPurchaseItems.registrationId, eventRegistrations.id)
    )
    .where(
      and(
        eq(eventRegistrationPurchaseItems.purchaseItemId, itemId),
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false)
      )
    );
  const [legacy] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.purchaseItemId, itemId),
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false)
      )
    );
  return Number(multi?.n ?? 0) + Number(legacy?.n ?? 0);
}

/** 從 request body 取出合法的時段價陣列 [{ tierId, amount }] */
function parsePrices(raw: unknown): { tierId: number; amount: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({ tierId: Number(p?.tierId), amount: Math.floor(Number(p?.amount)) }))
    .filter(
      (p) => Number.isInteger(p.tierId) && Number.isInteger(p.amount) && p.amount >= 0
    );
}

type Params = { params: Promise<{ eventId: string; itemId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 更新購買項目（hidden / 名稱 / 金額 / 各時段價）。提供哪個欄位就更新哪個。 */
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

  const updates: {
    hidden?: boolean;
    name?: string;
    amount?: number;
    groupId?: number | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if ("groupId" in body) {
    updates.groupId =
      body.groupId != null && Number.isInteger(Number(body.groupId))
        ? Number(body.groupId)
        : null;
  }
  if (typeof body.hidden === "boolean") updates.hidden = body.hidden;
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "名稱不可為空" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (body.amount !== undefined) {
    const amount = Math.floor(Number(body.amount));
    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json({ error: "金額需為非負整數" }, { status: 400 });
    }
    updates.amount = amount;
  }

  const replacePrices = "prices" in body;
  const prices = replacePrices ? parsePrices(body.prices) : [];

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(eventPurchaseItems)
      .set(updates)
      .where(
        and(
          eq(eventPurchaseItems.id, itemId),
          eq(eventPurchaseItems.eventId, eventId)
        )
      )
      .returning();
    if (!row) return null;

    // 提供 prices 時，整批取代該項目的時段價（含移除未列出的時段）
    if (replacePrices) {
      await tx
        .delete(eventPurchaseItemPrices)
        .where(eq(eventPurchaseItemPrices.purchaseItemId, itemId));
      if (prices.length > 0) {
        await tx.insert(eventPurchaseItemPrices).values(
          prices.map((p) => ({
            purchaseItemId: itemId,
            tierId: p.tierId,
            amount: p.amount,
          }))
        );
      }
    }
    return row;
  });

  if (!updated) {
    return NextResponse.json({ error: "找不到購買項目" }, { status: 404 });
  }

  return NextResponse.json({
    purchaseItem: replacePrices ? { ...updated, prices } : updated,
  });
}

/** 刪除購買項目。僅在尚無未隱藏報名綁定時允許（否則回 409，請改用隱藏）。 */
export async function DELETE(_request: Request, { params }: Params) {
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

  const activeCount = await countActiveRegistrations(eventId, itemId);
  if (activeCount > 0) {
    return NextResponse.json(
      { error: "已有人報名此項目，無法刪除（可改為隱藏）" },
      { status: 409 }
    );
  }

  // eventPurchaseItemPrices 透過 FK cascade 一併移除
  const [deleted] = await db
    .delete(eventPurchaseItems)
    .where(
      and(
        eq(eventPurchaseItems.id, itemId),
        eq(eventPurchaseItems.eventId, eventId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "找不到購買項目" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
