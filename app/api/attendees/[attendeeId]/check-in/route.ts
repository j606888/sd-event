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
import { apiError, apiMessage } from "@/lib/api-error";
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
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const attendeeId = Number((await params).attendeeId);
  if (!Number.isInteger(attendeeId)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "attendeeId" });
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
    return apiError("apiErrors.checkIn.attendeeNotFound", 404);
  }

  // 取得報名記錄以取得活動 ID
  const [registration] = await db
    .select({
      eventId: eventRegistrations.eventId,
      paymentStatus: eventRegistrations.paymentStatus,
    })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, attendee.registrationId))
    .limit(1);

  if (!registration) {
    return apiError("apiErrors.common.registrationNotFound", 404);
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, registration.eventId))
    .limit(1);

  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // 已退款的報名 QR 憑證已失效，不能入場
  if (registration.paymentStatus === "refunded") {
    return apiError("apiErrors.checkIn.refunded", 409);
  }

  // 如果已經入場，直接返回
  if (attendee.checkedIn) {
    const [updated] = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.id, attendeeId))
      .limit(1);
    return NextResponse.json({
      attendee: updated,
      message: await apiMessage("apiErrors.checkIn.alreadyCheckedIn"),
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
    message: await apiMessage("apiErrors.checkIn.checkedIn"),
  });
}

/**
 * 取消入場（需為該團隊成員）
 * 門口按錯人時的復原；權限與入場相同，驗票人員也能用。
 */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const attendeeId = Number((await params).attendeeId);
  if (!Number.isInteger(attendeeId)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "attendeeId" });
  }

  const [row] = await db
    .select({ teamId: events.teamId })
    .from(eventAttendees)
    .innerJoin(eventRegistrations, eq(eventRegistrations.id, eventAttendees.registrationId))
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(eq(eventAttendees.id, attendeeId))
    .limit(1);

  if (!row) {
    return apiError("apiErrors.checkIn.attendeeNotFound", 404);
  }

  const forbidden = await requireTeamMember(row.teamId, session.userId);
  if (forbidden) return forbidden;

  const [updated] = await db
    .update(eventAttendees)
    .set({ checkedIn: false, checkedInAt: null, updatedAt: new Date() })
    .where(eq(eventAttendees.id, attendeeId))
    .returning();

  return NextResponse.json({
    attendee: updated,
    message: await apiMessage("apiErrors.checkIn.undone"),
  });
}

/**
 * 取得參加者入場狀態（需為該團隊成員）
 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const attendeeId = Number((await params).attendeeId);
  if (!Number.isInteger(attendeeId)) {
    return apiError("apiErrors.common.invalidParam", 400, { param: "attendeeId" });
  }

  // 取得參加者記錄
  const [attendee] = await db
    .select()
    .from(eventAttendees)
    .where(eq(eventAttendees.id, attendeeId))
    .limit(1);

  if (!attendee) {
    return apiError("apiErrors.checkIn.attendeeNotFound", 404);
  }

  // 取得報名記錄以取得活動 ID
  const [registration] = await db
    .select({ eventId: eventRegistrations.eventId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, attendee.registrationId))
    .limit(1);

  if (!registration) {
    return apiError("apiErrors.common.registrationNotFound", 404);
  }

  // 檢查活動是否存在且使用者為團隊成員
  const [event] = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, registration.eventId))
    .limit(1);

  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  return NextResponse.json({ attendee });
}
