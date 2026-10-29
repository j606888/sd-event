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
import { apiError } from "@/lib/api-error";
import { and, eq, inArray, sql } from "drizzle-orm";

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

type Params = { params: Promise<{ eventId: string }> };


/** 取得活動的購買項目列表 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const list = await db
    .select()
    .from(eventPurchaseItems)
    .where(eq(eventPurchaseItems.eventId, eventId));

  // 一併帶出各項目的時段價，供管理 UI 回填
  const itemIds = list.map((i) => i.id);
  const priceRows =
    itemIds.length > 0
      ? await db
          .select()
          .from(eventPurchaseItemPrices)
          .where(inArray(eventPurchaseItemPrices.purchaseItemId, itemIds))
      : [];
  const pricesByItem = new Map<
    number,
    { tierId: number; amount: number; available: boolean }[]
  >();
  for (const row of priceRows) {
    const arr = pricesByItem.get(row.purchaseItemId) ?? [];
    arr.push({ tierId: row.tierId, amount: row.amount, available: row.available });
    pricesByItem.set(row.purchaseItemId, arr);
  }

  // 每個項目目前綁定的「未隱藏」報名數，供管理 UI 判斷可否刪除（零報名才可刪）
  const soldCountByItem = new Map<number, number>();
  if (itemIds.length > 0) {
    const multiCounts = await db
      .select({
        purchaseItemId: eventRegistrationPurchaseItems.purchaseItemId,
        n: sql<number>`cast(count(*) as int)`,
      })
      .from(eventRegistrationPurchaseItems)
      .innerJoin(
        eventRegistrations,
        eq(eventRegistrationPurchaseItems.registrationId, eventRegistrations.id)
      )
      .where(
        and(
          inArray(eventRegistrationPurchaseItems.purchaseItemId, itemIds),
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.hidden, false)
        )
      )
      .groupBy(eventRegistrationPurchaseItems.purchaseItemId);
    for (const row of multiCounts) {
      soldCountByItem.set(row.purchaseItemId, Number(row.n));
    }

    // 舊單選模式：只算「沒有 join 列」的報名，避免與 multiCounts 重複
    // （現在單選報名也會寫入 join table）
    const legacyCounts = await db
      .select({
        purchaseItemId: eventRegistrations.purchaseItemId,
        n: sql<number>`cast(count(*) as int)`,
      })
      .from(eventRegistrations)
      .where(
        and(
          inArray(eventRegistrations.purchaseItemId, itemIds),
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.hidden, false),
          sql`not exists (select 1 from ${eventRegistrationPurchaseItems} where ${eventRegistrationPurchaseItems.registrationId} = ${eventRegistrations.id})`
        )
      )
      .groupBy(eventRegistrations.purchaseItemId);
    for (const row of legacyCounts) {
      if (row.purchaseItemId == null) continue;
      soldCountByItem.set(
        row.purchaseItemId,
        (soldCountByItem.get(row.purchaseItemId) ?? 0) + Number(row.n)
      );
    }
  }

  const purchaseItems = list.map((item) => ({
    ...item,
    prices: pricesByItem.get(item.id) ?? [],
    soldCount: soldCountByItem.get(item.id) ?? 0,
  }));

  return NextResponse.json({ purchaseItems });
}

/** 新增購買項目 */
export async function POST(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
  if (!name || !Number.isInteger(amount) || amount < 0) {
    return apiError("eventApiErrors.purchaseItems.nameAmountRequired", 400);
  }

  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;
  const hidden = body.hidden === true;
  const groupId =
    body.groupId != null && Number.isInteger(Number(body.groupId))
      ? Number(body.groupId)
      : null;
  const prices = parsePrices(body.prices);
  const seatCount = body.seatCount === undefined ? 1 : parseSeatCount(body.seatCount);
  if (seatCount == null) {
    return apiError("eventApiErrors.purchaseItems.seatCountInvalid", 400, { max: MAX_SEAT_COUNT });
  }
  const description = parseDescription(body.description);
  const minFlagged = body.minFlagged === undefined ? 0 : parseMinFlagged(body.minFlagged);
  if (minFlagged == null) {
    return apiError("eventApiErrors.purchaseItems.minFlaggedInvalid", 400, { max: MAX_MIN_FLAGGED });
  }

  const item = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(eventPurchaseItems)
      .values({ eventId, name, amount, sortOrder, hidden, groupId, seatCount, description, minFlagged })
      .returning();
    if (!created) return null;
    if (prices.length > 0) {
      await tx.insert(eventPurchaseItemPrices).values(
        prices.map((p) => ({
          purchaseItemId: created.id,
          tierId: p.tierId,
          amount: p.amount,
          available: p.available,
        }))
      );
    }
    return created;
  });

  if (!item) {
    return apiError("eventApiErrors.createFailed", 500);
  }

  return NextResponse.json({ purchaseItem: { ...item, prices } });
}
