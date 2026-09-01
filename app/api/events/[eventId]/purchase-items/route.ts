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
import { and, eq, inArray, sql } from "drizzle-orm";

/** 從 request body 取出合法的時段價陣列 [{ tierId, amount }] */
function parsePrices(raw: unknown): { tierId: number; amount: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({ tierId: Number(p?.tierId), amount: Math.floor(Number(p?.amount)) }))
    .filter(
      (p) => Number.isInteger(p.tierId) && Number.isInteger(p.amount) && p.amount >= 0
    );
}

type Params = { params: Promise<{ eventId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 取得活動的購買項目列表 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
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
  const pricesByItem = new Map<number, { tierId: number; amount: number }[]>();
  for (const row of priceRows) {
    const arr = pricesByItem.get(row.purchaseItemId) ?? [];
    arr.push({ tierId: row.tierId, amount: row.amount });
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
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
  if (!name || !Number.isInteger(amount) || amount < 0) {
    return NextResponse.json({ error: "請提供名稱 name 與金額 amount（非負整數）" }, { status: 400 });
  }

  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;
  const hidden = body.hidden === true;
  const groupId =
    body.groupId != null && Number.isInteger(Number(body.groupId))
      ? Number(body.groupId)
      : null;
  const prices = parsePrices(body.prices);

  const item = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(eventPurchaseItems)
      .values({ eventId, name, amount, sortOrder, hidden, groupId })
      .returning();
    if (!created) return null;
    if (prices.length > 0) {
      await tx.insert(eventPurchaseItemPrices).values(
        prices.map((p) => ({
          purchaseItemId: created.id,
          tierId: p.tierId,
          amount: p.amount,
        }))
      );
    }
    return created;
  });

  if (!item) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ purchaseItem: { ...item, prices } });
}
