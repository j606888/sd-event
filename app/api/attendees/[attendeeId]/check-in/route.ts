import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventAttendees,
  eventRegistrations,
  events,
  teamMembers,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ attendeeId: string }> };

/**
 * 檢查參加者入場（需為該團隊成員）
 * 用於掃描 QR code 後確認入場
 */
export async function POST(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const attendeeId = Number((await params).attendeeId);
  if (!Number.isInteger(attendeeId)) {
    return NextResponse.json({ error: "無效的 attendeeId" }, { status: 400 });
  }

  // 取得參加者記錄
  const [attendee] = await db
    .select({
      id: eventAttendees.id,
      registrationId: eventAttendees.registrationId,
      checkedIn: eventAttendees.checkedIn,
    })
    .from(eventAttendees)
    .where(eq(eventAttendees.id, attendeeId))
    .limit(1);

  if (!attendee) {
    return NextResponse.json({ error: "找不到參加者記錄" }, { status: 404 });
  }

  // 取得報名記錄以取得活動 ID
  const [registration] = await db
    .select({ eventId: eventRegistrations.eventId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, attendee.registrationId))
    .limit(1);

  if (!registration) {
    return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, registration.eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // 如果已經入場，直接返回
  if (attendee.checkedIn) {
    const [updated] = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.id, attendeeId))
      .limit(1);
    return NextResponse.json({
      attendee: updated,
      message: "已入場",
    });
  }

  // 更新入場狀態
  const [updated] = await db
    .update(eventAttendees)
    .set({
      checkedIn: true,
      checkedInAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(eventAttendees.id, attendeeId))
    .returning();

  return NextResponse.json({
    attendee: updated,
    message: "入場成功",
  });
}

/**
 * 取得參加者入場狀態（需為該團隊成員）
 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const attendeeId = Number((await params).attendeeId);
  if (!Number.isInteger(attendeeId)) {
    return NextResponse.json({ error: "無效的 attendeeId" }, { status: 400 });
  }

  // 取得參加者記錄
  const [attendee] = await db
    .select()
    .from(eventAttendees)
    .where(eq(eventAttendees.id, attendeeId))
    .limit(1);

  if (!attendee) {
    return NextResponse.json({ error: "找不到參加者記錄" }, { status: 404 });
  }

  // 取得報名記錄以取得活動 ID
  const [registration] = await db
    .select({ eventId: eventRegistrations.eventId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, attendee.registrationId))
    .limit(1);

  if (!registration) {
    return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, registration.eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  return NextResponse.json({ attendee });
}
