import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
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
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { eventId: rawEventId, registrationId: rawRegistrationId } = await params;
  const eventId = Number(rawEventId);
  const registrationId = Number(rawRegistrationId);
  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    return NextResponse.json({ error: "無效的參數" }, { status: 400 });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamAdmin(event.teamId, session.userId);
  if (forbidden) return forbidden;

  // 一併比對 eventId，避免用別場活動的 id 取到這筆報名
  const [registration] = await db
    .select({
      contactEmail: eventRegistrations.contactEmail,
      registrationKey: eventRegistrations.registrationKey,
      paymentStatus: eventRegistrations.paymentStatus,
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
    return NextResponse.json({ error: "找不到報名記錄" }, { status: 404 });
  }

  if (registration.paymentStatus !== "confirmed") {
    return NextResponse.json(
      { error: "這筆報名尚未確認收款，沒有確認信可以重寄" },
      { status: 400 }
    );
  }

  if (!registration.contactEmail) {
    return NextResponse.json(
      { error: "這筆報名沒有填 email，無法寄信" },
      { status: 400 }
    );
  }

  // 這支是使用者按下去等結果的動作，所以要 await 並把失敗回報出去，
  // 不像 PATCH 的自動寄信是 fire-and-forget。
  const ctx = await loadConfirmationEmailContext(event);
  const result = await sendConfirmationEmail(
    ctx,
    registration.contactEmail,
    registration.registrationKey
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "寄信失敗，請稍後再試" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, sentTo: registration.contactEmail });
}
