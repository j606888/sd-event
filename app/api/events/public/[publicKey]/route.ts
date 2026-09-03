import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventLocations,
  organizers,
  bankInfos,
  eventPurchaseItems,
  eventPurchaseItemGroups,
  eventPriceTiers,
  eventPurchaseItemPrices,
  eventGroupExclusions,
  eventNoticeItems,
  eventCoupons,
} from "@/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { resolveActiveTier, getItemUnitPrice } from "@/lib/pricing";
import { getSession } from "@/lib/auth";
import { requireTeamMember } from "@/lib/api-auth";

type Params = { params: Promise<{ publicKey: string }> };

/**
 * 依公開金鑰取得活動（不需登入）
 * 用於分享連結、對外報名頁
 */
export async function GET(_request: Request, { params }: Params) {
  const publicKey = (await params).publicKey?.trim();
  if (!publicKey) {
    return NextResponse.json({ error: "請提供公開金鑰" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.publicKey, publicKey))
    .limit(1);
  const event = rows[0];
  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  // 草稿活動僅該團隊成員可見（預覽）；對外一律視同不存在
  if (event.status !== "published") {
    const session = await getSession();
    const forbidden = session
      ? await requireTeamMember(event.teamId, session.userId)
      : null;
    if (!session || forbidden) {
      return NextResponse.json({ error: "找不到活動" }, { status: 404 });
    }
  }

  // Fetch related data
  const [
    location,
    organizer,
    bankInfo,
    purchaseItems,
    noticeItems,
    priceTiers,
    groups,
    exclusions,
    couponRows,
  ] = await Promise.all([
    event.locationId
      ? db
          .select()
          .from(eventLocations)
          .where(eq(eventLocations.id, event.locationId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null),
    event.organizerId
      ? db
          .select()
          .from(organizers)
          .where(eq(organizers.id, event.organizerId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null),
    event.bankInfoId
      ? db
          .select()
          .from(bankInfos)
          .where(eq(bankInfos.id, event.bankInfoId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null),
    db
      .select()
      .from(eventPurchaseItems)
      .where(
        and(
          eq(eventPurchaseItems.eventId, event.id),
          eq(eventPurchaseItems.hidden, false)
        )
      )
      .orderBy(asc(eventPurchaseItems.sortOrder)),
    db
      .select()
      .from(eventNoticeItems)
      .where(eq(eventNoticeItems.eventId, event.id))
      .orderBy(asc(eventNoticeItems.sortOrder)),
    db
      .select()
      .from(eventPriceTiers)
      .where(eq(eventPriceTiers.eventId, event.id))
      .orderBy(asc(eventPriceTiers.sortOrder)),
    db
      .select()
      .from(eventPurchaseItemGroups)
      .where(eq(eventPurchaseItemGroups.eventId, event.id))
      .orderBy(asc(eventPurchaseItemGroups.sortOrder)),
    db
      .select({
        groupAId: eventGroupExclusions.groupAId,
        groupBId: eventGroupExclusions.groupBId,
      })
      .from(eventGroupExclusions)
      .where(eq(eventGroupExclusions.eventId, event.id)),
    db
      .select({ id: eventCoupons.id })
      .from(eventCoupons)
      .where(eq(eventCoupons.eventId, event.id))
      .limit(1),
    ]);

  // 解析當下生效時段（伺服器時間），把每個項目的 amount 換成該時段的有效價。
  const activeTier = resolveActiveTier(priceTiers, new Date());
  // 最後一段（endsAt = null 的一般／現場價）視為原價，報名頁據此顯示「現省多少」。
  const lastTier =
    priceTiers.length > 0
      ? [...priceTiers].sort((a, b) => a.sortOrder - b.sortOrder).at(-1)!
      : null;
  const itemIds = purchaseItems.map((i) => i.id);
  const priceRows =
    priceTiers.length > 0 && itemIds.length > 0
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
  const itemsWithPrice = purchaseItems.map((item) => {
    const prices = pricesByItem.get(item.id) ?? [];
    return {
      ...item,
      amount: getItemUnitPrice(item.amount, prices, activeTier?.id ?? null),
      fullAmount: getItemUnitPrice(item.amount, prices, lastTier?.id ?? null),
    };
  });

  // 組裝群組：每個群組帶入其下（已解析時段價、未隱藏）的項目
  const itemsByGroup = new Map<number, typeof itemsWithPrice>();
  for (const item of itemsWithPrice) {
    if (item.groupId == null) continue;
    const arr = itemsByGroup.get(item.groupId) ?? [];
    arr.push(item);
    itemsByGroup.set(item.groupId, arr);
  }
  // 互斥配對為對稱關係，雙向展開成每個群組的 excludesGroupIds
  const excludesByGroup = new Map<number, Set<number>>();
  for (const { groupAId, groupBId } of exclusions) {
    if (!excludesByGroup.has(groupAId)) excludesByGroup.set(groupAId, new Set());
    if (!excludesByGroup.has(groupBId)) excludesByGroup.set(groupBId, new Set());
    excludesByGroup.get(groupAId)!.add(groupBId);
    excludesByGroup.get(groupBId)!.add(groupAId);
  }
  const groupsWithItems = groups.map((g) => ({
    id: g.id,
    title: g.title,
    selectionMode: g.selectionMode,
    required: g.required,
    sortOrder: g.sortOrder,
    items: itemsByGroup.get(g.id) ?? [],
    excludesGroupIds: Array.from(excludesByGroup.get(g.id) ?? []),
  }));

  return NextResponse.json({
    event: {
      ...event,
      location,
      organizer,
      bankInfo,
      purchaseItems: itemsWithPrice,
      groups: groupsWithItems,
      activeTier: activeTier
        ? { name: activeTier.name, endsAt: activeTier.endsAt }
        : null,
      // 原價所屬時段名稱（供「原價」的無障礙說明用）
      fullPriceTierName: lastTier?.name ?? null,
      noticeItems,
      // 報名表僅在活動確實設有折扣碼時顯示輸入欄位
      hasCoupons: couponRows.length > 0,
    },
  });
}
