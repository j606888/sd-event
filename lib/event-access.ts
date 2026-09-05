import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTeamAdmin, requireTeamMember } from "@/lib/api-auth";

type Event = typeof events.$inferSelect;
type EventAccess = { event: Event } | { error: NextResponse };

async function loadEvent(eventId: number): Promise<Event | undefined> {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return rows[0];
}

/** 取得活動並確認使用者是該團隊的管理員（驗票人員 403） */
export async function requireEventAdmin(
  eventId: number,
  userId: number
): Promise<EventAccess> {
  const event = await loadEvent(eventId);
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamAdmin(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 取得活動並確認使用者是該團隊成員（驗票人員也放行） */
export async function requireEventMember(
  eventId: number,
  userId: number
): Promise<EventAccess> {
  const event = await loadEvent(eventId);
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}
