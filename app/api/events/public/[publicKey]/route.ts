import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventLocations,
  organizers,
  bankInfos,
  eventPurchaseItems,
  eventNoticeItems,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

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

  // Fetch related data
  const [location, organizer, bankInfo, purchaseItems, noticeItems] = await Promise.all([
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
      .where(eq(eventPurchaseItems.eventId, event.id))
      .orderBy(asc(eventPurchaseItems.sortOrder)),
    db
      .select()
      .from(eventNoticeItems)
      .where(eq(eventNoticeItems.eventId, event.id))
      .orderBy(asc(eventNoticeItems.sortOrder)),
  ]);

  return NextResponse.json({
    event: {
      ...event,
      location,
      organizer,
      bankInfo,
      purchaseItems,
      noticeItems,
    },
  });
}
