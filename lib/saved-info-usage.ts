import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankInfos, eventLocations, events, linePayees, organizers } from "@/db/schema";
import { apiMessage } from "@/lib/api-error";
import { isOnSale, PAYMENT_KINDS, type SavedInfoKind, type UsingEvent } from "@/lib/saved-info";
import { and, eq, inArray } from "drizzle-orm";

const TABLES = {
  location: eventLocations,
  organizer: organizers,
  bankInfo: bankInfos,
  linePayee: linePayees,
} as const;

const EVENT_FK = {
  location: events.locationId,
  organizer: events.organizerId,
  bankInfo: events.bankInfoId,
  linePayee: events.linePayeeId,
} as const;

const NOT_FOUND_KEY = {
  location: "apiErrors.savedInfo.locationNotFound",
  organizer: "apiErrors.savedInfo.organizerNotFound",
  bankInfo: "apiErrors.savedInfo.bankInfoNotFound",
  linePayee: "apiErrors.savedInfo.linePayeeNotFound",
} as const;

/** 一次查出多筆常用資訊各被哪些活動使用：id → 活動列表（開始時間由新到舊） */
export async function findUsingEvents(
  kind: SavedInfoKind,
  ids: number[]
): Promise<Map<number, UsingEvent[]>> {
  const usage = new Map<number, UsingEvent[]>();
  if (ids.length === 0) return usage;

  const fk = EVENT_FK[kind];
  const rows = await db
    .select({
      refId: fk,
      id: events.id,
      title: events.title,
      startAt: events.startAt,
      endAt: events.endAt,
      status: events.status,
    })
    .from(events)
    .where(inArray(fk, ids));

  rows.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  for (const { refId, ...event } of rows) {
    if (refId == null) continue;
    const list = usage.get(refId) ?? [];
    list.push(event);
    usage.set(refId, list);
  }
  return usage;
}

/**
 * 刪除一筆常用資訊（呼叫前已驗證登入與團隊管理員）。
 * 付款資訊若有正在報名的活動在用，回 409 並附上那些活動，讓前端提示先去換掉。
 */
export async function deleteSavedInfo(
  kind: SavedInfoKind,
  teamId: number,
  id: number
): Promise<NextResponse> {
  const table = TABLES[kind];
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: await apiMessage(NOT_FOUND_KEY[kind]) }, { status: 404 });
  }

  if (PAYMENT_KINDS.includes(kind)) {
    const usedBy = (await findUsingEvents(kind, [id])).get(id) ?? [];
    const onSale = usedBy.filter((event) => isOnSale(event));
    if (onSale.length > 0) {
      return NextResponse.json(
        {
          error: await apiMessage("apiErrors.savedInfo.inUseByOnSaleEvent"),
          blockingEvents: onSale,
        },
        { status: 409 }
      );
    }
  }

  await db.delete(table).where(eq(table.id, id));
  return NextResponse.json({ ok: true });
}
