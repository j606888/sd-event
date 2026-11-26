import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventPurchaseItemGroups,
  eventPurchaseItems,
  eventPriceTiers,
  eventGroupCombos,
  eventGroupComboPrices,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { apiError } from "@/lib/api-error";
import { validateComboConfig } from "@/lib/combo-pricing";
import { loadGroupCombos } from "@/lib/combo-data";
import { and, asc, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string; groupId: string }> };

type ComboInput = {
  count: number;
  title: string | null;
  amount: number;
  giftItemId: number | null;
  prices: { tierId: number; amount: number }[];
};

type RawCombo = {
  count?: unknown;
  title?: unknown;
  amount?: unknown;
  giftItemId?: unknown;
  prices?: unknown;
};

function parseCombos(raw: unknown): ComboInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: unknown) => {
    const c = (entry ?? {}) as RawCombo;
    const prices = Array.isArray(c.prices) ? (c.prices as { tierId?: unknown; amount?: unknown }[]) : [];
    return {
      count: Number(c.count),
      title: typeof c.title === "string" && c.title.trim() ? c.title.trim() : null,
      amount: Number(c.amount),
      giftItemId: c.giftItemId != null && c.giftItemId !== "" ? Number(c.giftItemId) : null,
      prices: prices.map((p) => ({ tierId: Number(p?.tierId), amount: Number(p?.amount) })),
    };
  });
}

/**
 * 設定票券區塊的組合價（replace-all）。
 * body: { comboPricing: boolean, combos: [{ count, title, amount, giftItemId, prices: [{ tierId, amount }] }] }
 * 關閉時只把開關關掉、保留價目表，重新打開可沿用。
 */
export async function PUT(request: Request, { params }: Params) {
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

  const [group] = await db
    .select()
    .from(eventPurchaseItemGroups)
    .where(and(eq(eventPurchaseItemGroups.id, groupId), eq(eventPurchaseItemGroups.eventId, eventId)))
    .limit(1);
  if (!group) return apiError("eventApiErrors.purchaseItemGroups.notFound", 404);

  const body = await request.json().catch(() => ({}));
  const enabled = body.comboPricing === true;

  if (!enabled) {
    const [updated] = await db
      .update(eventPurchaseItemGroups)
      .set({ comboPricing: false, updatedAt: new Date() })
      .where(eq(eventPurchaseItemGroups.id, groupId))
      .returning();
    const combos = (await loadGroupCombos([groupId])).get(groupId) ?? [];
    return NextResponse.json({ group: { ...updated, combos } });
  }

  const [items, tiers] = await Promise.all([
    db
      .select({
        id: eventPurchaseItems.id,
        name: eventPurchaseItems.name,
        seatCount: eventPurchaseItems.seatCount,
        groupId: eventPurchaseItems.groupId,
        hidden: eventPurchaseItems.hidden,
      })
      .from(eventPurchaseItems)
      .where(eq(eventPurchaseItems.eventId, eventId)),
    db
      .select()
      .from(eventPriceTiers)
      .where(eq(eventPriceTiers.eventId, eventId))
      .orderBy(asc(eventPriceTiers.sortOrder)),
  ]);

  const tierIds = new Set(tiers.map((t) => t.id));
  const lastTierId = tiers.at(-1)?.id ?? null;
  const combos = parseCombos(body.combos).map((c) => {
    const prices = c.prices.filter((p) => tierIds.has(p.tierId));
    // 有時段時 fallback 價 = 最後一段價格（與票券一致）
    const lastPrice = lastTierId != null ? prices.find((p) => p.tierId === lastTierId) : undefined;
    return { ...c, prices, amount: lastPrice ? lastPrice.amount : c.amount };
  });

  const groupItems = items.filter((i) => i.groupId === groupId && !i.hidden);
  const configError = validateComboConfig({
    selectionMode: group.selectionMode,
    items: groupItems,
    combos,
    giftableItemIds: new Set(items.filter((i) => i.groupId !== groupId).map((i) => i.id)),
  });
  if (configError) {
    return apiError(
      `eventApiErrors.combos.${configError.code}`,
      400,
      "values" in configError ? configError.values : undefined
    );
  }

  // 只保留 1..票數 的列（多出的舊列刪掉）
  const kept = combos.filter((c) => c.count >= 1 && c.count <= groupItems.length);

  await db.transaction(async (tx) => {
    await tx.delete(eventGroupCombos).where(eq(eventGroupCombos.groupId, groupId));
    for (const c of kept) {
      const [row] = await tx
        .insert(eventGroupCombos)
        .values({
          groupId,
          count: c.count,
          title: c.title,
          amount: c.amount,
          giftItemId: c.giftItemId,
        })
        .returning({ id: eventGroupCombos.id });
      if (c.prices.length > 0) {
        await tx
          .insert(eventGroupComboPrices)
          .values(c.prices.map((p) => ({ comboId: row.id, tierId: p.tierId, amount: p.amount })));
      }
    }
    await tx
      .update(eventPurchaseItemGroups)
      .set({ comboPricing: true, updatedAt: new Date() })
      .where(eq(eventPurchaseItemGroups.id, groupId));
  });

  const saved = (await loadGroupCombos([groupId])).get(groupId) ?? [];
  return NextResponse.json({ group: { ...group, comboPricing: true, combos: saved } });
}
