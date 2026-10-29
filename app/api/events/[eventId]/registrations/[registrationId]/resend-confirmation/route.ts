import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  loadConfirmationEmailContext,
  sendConfirmationEmail,
} from "@/lib/registration-email";
import { and, eq } from "drizzle-orm";

type Params = {
  params: Promise<{ eventId: string; registrationId: string }>;
};

/**
 * 重寄收款確認信（需為該團隊成員）。
 *
 * 主辦常遇到「對方說沒收到信」，目前只能改狀態來回切才會重寄。
 * 這支只重寄、不動任何狀態。
 */
export async function POST(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const { eventId: rawEventId, registrationId: rawRegistrationId } = await params;
  const eventId = Number(rawEventId);
  const registrationId = Number(rawRegistrationId);
  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    return apiError("eventApiErrors.invalidParams", 400);
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return apiError("apiErrors.common.eventNotFound", 404);
  }

  const forbidden = await requireTeamAdmin(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // 一併比對 eventId，避免用別場活動的 id 取到這筆報名
  const [registration] = await db
    .select({
      contactEmail: eventRegistrations.contactEmail,
      registrationKey: eventRegistrations.registrationKey,
      paymentStatus: eventRegistrations.paymentStatus,
      locale: eventRegistrations.locale,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, registrationId),
        eq(eventRegistrations.eventId, eventId)
      )
    )
    .limit(1);

  if (!registration) {
    return apiError("eventApiErrors.registrationNotFound", 404);
  }

  if (registration.paymentStatus !== "confirmed") {
    return apiError("eventApiErrors.resendConfirmation.notConfirmed", 400);
  }

  if (!registration.contactEmail) {
    return apiError("eventApiErrors.resendConfirmation.noEmail", 400);
  }

  // 這支是使用者按下去等結果的動作，所以要 await 並把失敗回報出去，
  // 不像 PATCH 的自動寄信是 fire-and-forget。
  const ctx = await loadConfirmationEmailContext(event);
  const result = await sendConfirmationEmail(
    ctx,
    registration.contactEmail,
    registration.registrationKey,
    registration.locale
  );

  if (!result.ok) {
    // 原始錯誤（來自 Resend）只記 log，回給前端的是翻譯過的通用訊息
    console.error("Resend confirmation email error:", result.error);
    return apiError("eventApiErrors.resendConfirmation.sendFailed", 502);
  }

  return NextResponse.json({ ok: true, sentTo: registration.contactEmail });
}
