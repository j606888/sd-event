import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamAdmin } from "@/lib/api-auth";
import { sendRefundedEmail } from "@/lib/email";
import { and, eq } from "drizzle-orm";

type Params = {
  params: Promise<{ eventId: string; registrationId: string }>;
};

const REFUND_METHODS = ["Bank Transfer", "Line Pay", "Cash"] as const;

/** 共用：驗證身分並取得這筆報名（需為團隊管理員） */
async function loadRegistration(params: Params["params"]) {
  const authError = await requireAuth();
  if (authError) return { error: authError };

  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "未登入" }, { status: 401 }) };
  }

  const { eventId: rawEventId, registrationId: rawRegistrationId } = await params;
  const eventId = Number(rawEventId);
  const registrationId = Number(rawRegistrationId);
  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    return { error: NextResponse.json({ error: "無效的參數" }, { status: 400 }) };
  }

  const [event] = await db
    .select({ id: events.id, teamId: events.teamId, title: events.title })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  }

  const forbidden = await requireTeamAdmin(event.teamId, session.userId);
  if (forbidden) return { error: forbidden };

  // 一併比對 eventId，避免用別場活動的 id 取到這筆報名
  const [registration] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, registrationId),
        eq(eventRegistrations.eventId, eventId)
      )
    )
    .limit(1);

  if (!registration) {
    return { error: NextResponse.json({ error: "找不到報名記錄" }, { status: 404 }) };
  }

  return { session, event, registration };
}

/**
 * 標記為已退款（全額）。
 *
 * 系統不會轉帳，主辦退完錢後回來記一筆。只有「已收款」的報名能退款；
 * 還沒收到錢的人用「拒絕付款」或「隱藏」即可。
 * 已退款的報名不再計入人數、L/F、入帳金額，也不能入場。
 */
export async function POST(request: Request, { params }: Params) {
  const loaded = await loadRegistration(params);
  if ("error" in loaded) return loaded.error;
  const { session, event, registration } = loaded;

  if (registration.paymentStatus !== "confirmed") {
    return NextResponse.json(
      { error: "只有已收款的報名可以標記退款" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const method = REFUND_METHODS.includes(body.method) ? (body.method as string) : null;
  if (!method) {
    return NextResponse.json({ error: "請選擇退款方式" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const notify = body.notify === true;

  const [updated] = await db
    .update(eventRegistrations)
    .set({
      paymentStatus: "refunded",
      refundedAt: new Date(),
      refundMethod: method,
      refundNote: note,
      refundedByUserId: session.userId,
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registration.id))
    .returning();

  // 現場現金報名可能沒有 email，此時略過寄信
  if (notify && updated.contactEmail) {
    sendRefundedEmail(
      updated.contactEmail,
      updated.registrationKey,
      updated.totalAmount,
      event.title ?? undefined
    ).catch((err) => console.error("Refunded email error:", err));
  }

  return NextResponse.json({ registration: updated });
}

/**
 * 撤銷退款：按錯時的復原，回到「已收款」並清掉退款紀錄。
 */
export async function DELETE(_request: Request, { params }: Params) {
  const loaded = await loadRegistration(params);
  if ("error" in loaded) return loaded.error;
  const { registration } = loaded;

  if (registration.paymentStatus !== "refunded") {
    return NextResponse.json({ error: "這筆報名沒有退款紀錄" }, { status: 400 });
  }

  const [updated] = await db
    .update(eventRegistrations)
    .set({
      paymentStatus: "confirmed",
      refundedAt: null,
      refundMethod: null,
      refundNote: null,
      refundedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registration.id))
    .returning();

  return NextResponse.json({ registration: updated });
}
