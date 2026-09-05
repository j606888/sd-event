import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventPurchaseItemGroups,
  eventGroupExclusions,
  eventPriceTiers,
  eventPurchaseItemPrices,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getTeamRole, requireAuth, requireTeamMember } from "@/lib/api-auth";
import { isTeamAdmin } from "@/lib/team-roles";
import { validateGroupSelection, resolveUnitPrices } from "@/lib/registration-pricing";
import { eq, and, inArray, asc } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

function generateRegistrationKey(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  return customAlphabet(alphabet, 12)();
}

/**
 * 現場報名（walk-in）：由主辦在門口快速建立報名。
 * - 需登入且為該活動團隊成員。
 * - 只強制姓名 + 至少一位參加者；電話/信箱選填。
 * - 付款方式固定為現金、付款狀態直接為 confirmed、來源標記 walk_in。
 * - 金額預設帶入當下時段價（Σ單價 × 人數），可由主辦覆寫。
 * - autoCheckIn（預設 true）時，建立的參加者一併標記為已入場。
 */
export async function POST(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  try {
    const eventId = Number((await params).eventId);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
    }

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "找不到活動" }, { status: 404 });
    }

    const forbidden = await requireTeamMember(event.teamId, session.userId);
    if (forbidden) return forbidden;

    // 驗票人員可以現場報名收現金，但不能自訂價格
    const canOverrideAmount = isTeamAdmin(
      await getTeamRole(event.teamId, session.userId)
    );

    const body = await request.json().catch(() => ({}));

    const purchaseItemId =
      body.purchaseItemId != null ? Number(body.purchaseItemId) : null;
    const purchaseItemIds = Array.isArray(body.purchaseItemIds)
      ? body.purchaseItemIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id))
      : [];
    const contactName =
      typeof body.contactName === "string" ? body.contactName.trim() : "";
    const contactPhone =
      typeof body.contactPhone === "string" && body.contactPhone.trim()
        ? body.contactPhone.trim()
        : null;
    const contactEmail =
      typeof body.contactEmail === "string" && body.contactEmail.trim()
        ? body.contactEmail.trim()
        : null;
    const attendees = Array.isArray(body.attendees) ? body.attendees : [];
    const autoCheckIn = body.autoCheckIn !== false; // 預設 true

    // 群組活動 → 走多選路徑並依群組規則驗證
    const groups = await db
      .select()
      .from(eventPurchaseItemGroups)
      .where(eq(eventPurchaseItemGroups.eventId, eventId));
    const useGroups = groups.length > 0;
    const effectiveMultiple = useGroups || !!event.allowMultiplePurchase;

    const hasPurchaseItems = effectiveMultiple
      ? purchaseItemIds.length > 0
      : purchaseItemId != null;

    if (!contactName || attendees.length === 0 || !hasPurchaseItems) {
      return NextResponse.json(
        { error: "請提供姓名、購買項目與至少一位參加者" },
        { status: 400 }
      );
    }

    // email 有填才驗證格式
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "請提供有效的 email" }, { status: 400 });
    }

    // 驗證購買項目存在（限本活動、未隱藏）
    if (effectiveMultiple) {
      const items = await db
        .select()
        .from(eventPurchaseItems)
        .where(
          and(
            eq(eventPurchaseItems.eventId, eventId),
            eq(eventPurchaseItems.hidden, false)
          )
        );
      const validItemIds = items.map((it) => it.id);
      const invalidIds = purchaseItemIds.filter(
        (id: number) => !validItemIds.includes(id)
      );
      if (invalidIds.length > 0) {
        return NextResponse.json({ error: "無效的購買項目" }, { status: 400 });
      }

      if (useGroups) {
        const exclusions = await db
          .select({
            groupAId: eventGroupExclusions.groupAId,
            groupBId: eventGroupExclusions.groupBId,
          })
          .from(eventGroupExclusions)
          .where(eq(eventGroupExclusions.eventId, eventId));
        const groupError = validateGroupSelection(
          groups,
          items,
          purchaseItemIds,
          exclusions
        );
        if (groupError) {
          return NextResponse.json({ error: groupError }, { status: 400 });
        }
      }
    } else if (purchaseItemId != null) {
      const [item] = await db
        .select()
        .from(eventPurchaseItems)
        .where(eq(eventPurchaseItems.id, purchaseItemId))
        .limit(1);
      if (!item || item.eventId !== eventId || item.hidden) {
        return NextResponse.json({ error: "無效的購買項目" }, { status: 400 });
      }
    }

    // 驗證參加者資料
    const validAttendees = attendees.filter(
      (a: { name?: unknown; role?: unknown }) =>
        typeof a.name === "string" &&
        a.name.trim() &&
        typeof a.role === "string" &&
        ["Leader", "Follower", "Not sure"].includes(a.role)
    );
    if (validAttendees.length === 0) {
      return NextResponse.json(
        { error: "請提供至少一位有效的參加者（姓名與角色）" },
        { status: 400 }
      );
    }

    // 解析當下時段單價，算出預設總額
    const selectedIds = effectiveMultiple
      ? purchaseItemIds
      : purchaseItemId != null
        ? [purchaseItemId]
        : [];

    const [selectedItems, tiers, priceRows] = await Promise.all([
      selectedIds.length > 0
        ? db
            .select({ id: eventPurchaseItems.id, amount: eventPurchaseItems.amount })
            .from(eventPurchaseItems)
            .where(inArray(eventPurchaseItems.id, selectedIds))
        : Promise.resolve([] as { id: number; amount: number }[]),
      db
        .select()
        .from(eventPriceTiers)
        .where(eq(eventPriceTiers.eventId, eventId))
        .orderBy(asc(eventPriceTiers.sortOrder)),
      selectedIds.length > 0
        ? db
            .select()
            .from(eventPurchaseItemPrices)
            .where(inArray(eventPurchaseItemPrices.purchaseItemId, selectedIds))
        : Promise.resolve(
            [] as { purchaseItemId: number; tierId: number; amount: number }[]
          ),
    ]);

    const { activeTier, unitPriceById } = resolveUnitPrices(
      selectedItems,
      tiers,
      priceRows,
      new Date()
    );

    const computedTotal =
      selectedIds.reduce(
        (sum: number, id: number) => sum + (unitPriceById.get(id) ?? 0),
        0
      ) * validAttendees.length;

    // 管理員可覆寫金額：body.totalAmount 為正整數時以其為準，否則用系統算出的值。
    // 驗票人員一律使用依時段價算出的金額，忽略 body.totalAmount。
    const overrideAmount = Number(body.totalAmount);
    const finalTotalAmount =
      canOverrideAmount && Number.isInteger(overrideAmount) && overrideAmount > 0
        ? overrideAmount
        : computedTotal;

    if (!Number.isInteger(finalTotalAmount) || finalTotalAmount <= 0) {
      return NextResponse.json({ error: "總金額計算錯誤" }, { status: 400 });
    }

    const registrationKey = generateRegistrationKey();
    const now = new Date();

    const registration = await db.transaction(async (tx) => {
      const [reg] = await tx
        .insert(eventRegistrations)
        .values({
          registrationKey,
          eventId,
          purchaseItemId: effectiveMultiple
            ? null
            : Number.isInteger(purchaseItemId)
              ? purchaseItemId
              : null,
          contactName,
          contactPhone,
          contactEmail,
          source: "walk_in",
          paymentMethod: "Cash",
          totalAmount: finalTotalAmount,
          paymentStatus: "confirmed",
        })
        .returning();

      if (!reg) throw new Error("建立報名失敗");

      // 單選也寫入，保留收費當下的單價快照（見公開報名 route 的說明）
      if (selectedIds.length > 0) {
        await tx.insert(eventRegistrationPurchaseItems).values(
          selectedIds.map((itemId: number) => ({
            registrationId: reg.id,
            purchaseItemId: itemId,
            quantity: 1,
            unitAmount: unitPriceById.get(itemId) ?? null,
            tierName: activeTier?.name ?? null,
          }))
        );
      }

      await tx.insert(eventAttendees).values(
        validAttendees.map((a: { name: string; role: string }) => ({
          registrationId: reg.id,
          name: a.name.trim(),
          role: a.role,
          checkedIn: autoCheckIn,
          checkedInAt: autoCheckIn ? now : null,
        }))
      );

      return reg;
    });

    return NextResponse.json({
      registration: {
        id: registration.id,
        registrationKey: registration.registrationKey,
        eventId: registration.eventId,
        contactName: registration.contactName,
        source: registration.source,
        paymentMethod: registration.paymentMethod,
        totalAmount: registration.totalAmount,
        paymentStatus: registration.paymentStatus,
        createdAt: registration.createdAt,
      },
    });
  } catch (e) {
    console.error("Walk-in registration error:", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
