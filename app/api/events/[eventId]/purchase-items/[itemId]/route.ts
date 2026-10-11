import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventPurchaseItems,
  eventPurchaseItemPrices,
  eventRegistrations,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { MAX_MIN_FLAGGED, parseMinFlagged } from "@/lib/attendee-flag";
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
  // 舊單選模式：只算「沒有 join 列」的報名，避免與 multi 重複計數
  const [legacy] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.purchaseItemId, itemId),
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.hidden, false),
        sql`not exists (select 1 from ${eventRegistrationPurchaseItems} where ${eventRegistrationPurchaseItems.registrationId} = ${eventRegistrations.id})`
      )
    );
  return Number(multi?.n ?? 0) + Number(legacy?.n ?? 0);
}

/** 從 request body 取出合法的時段價陣列 [{ tierId, amount }] */
function parsePrices(
  raw: unknown
): { tierId: number; amount: number; available: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      // available = false：此時段不販售（如早鳥限定票），價格無意義一律存 0
      const available = p?.available !== false;
      return {
        tierId: Number(p?.tierId),
        amount: available ? Math.floor(Number(p?.amount)) : 0,
        available,
      };
    })
    .filter(
      (p) => Number.isInteger(p.tierId) && Number.isInteger(p.amount) && p.amount >= 0
    );
}


/** 套票人數上限；超過這個數字的「套票」應該拆成一般票處理 */
const MAX_SEAT_COUNT = 10;

/** 解析 seatCount：1..MAX_SEAT_COUNT 的整數，否則 null（無效） */
function parseSeatCount(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= MAX_SEAT_COUNT ? n : null;
}

/** 解析票券說明：trim 後空字串存成 null */
function parseDescription(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

type Params = { params: Promise<{ eventId: string; itemId: string }> };


/** 更新購買項目（hidden / 名稱 / 金額 / 每張票人數 / 說明 / 各時段價）。提供哪個欄位就更新哪個。 */
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

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));

  const updates: {
    hidden?: boolean;
    name?: string;
    amount?: number;
    groupId?: number | null;
    seatCount?: number;
    description?: string | null;
    minFlagged?: number;
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

  if ("description" in body) updates.description = parseDescription(body.description);
  if (body.minFlagged !== undefined) {
    const minFlagged = parseMinFlagged(body.minFlagged);
    if (minFlagged == null) {
      return NextResponse.json(
        { error: `至少勾選人數需為 0–${MAX_MIN_FLAGGED} 的整數` },
        { status: 400 }
      );
    }
    updates.minFlagged = minFlagged;
  }
  if (body.seatCount !== undefined) {
    const seatCount = parseSeatCount(body.seatCount);
    if (seatCount == null) {
      return NextResponse.json(
        { error: `每張票人數需為 1–${MAX_SEAT_COUNT} 的整數` },
        { status: 400 }
      );
    }
    // 已售出的票改人數會讓既有報名的收費與統計對不起來（統計以目前 seatCount 回推），故擋下
    const [current] = await db
      .select({ seatCount: eventPurchaseItems.seatCount })
      .from(eventPurchaseItems)
      .where(
        and(eq(eventPurchaseItems.id, itemId), eq(eventPurchaseItems.eventId, eventId))
      )
      .limit(1);
    if (current && current.seatCount !== seatCount) {
      if ((await countActiveRegistrations(eventId, itemId)) > 0) {
        return NextResponse.json(
          { error: "已有人報名此票券，無法修改每張票人數（可隱藏後另開新票券）" },
          { status: 409 }
        );
      }
      updates.seatCount = seatCount;
    }
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
            available: p.available,
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

  const access = await requireEventAdmin(eventId, session.userId);
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
