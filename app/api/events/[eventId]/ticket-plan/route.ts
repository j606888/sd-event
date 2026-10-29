import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { apiError } from "@/lib/api-error";
import { db } from "@/db";
import { parseTicketPlan, type TicketPlan } from "@/lib/ticket-plan";
import { applyTicketPlan, computeTicketFingerprint } from "@/lib/ticket-plan-sync";

type Params = { params: Promise<{ eventId: string }> };

/**
 * 取得售票精靈的答案。inSync = 套用之後票券設定沒有被手動改過；
 * false 時後台改以進階設定為準，精靈只能「重新設定」。
 */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const plan = (access.event.ticketPlan as TicketPlan | null) ?? null;
  const inSync =
    plan != null &&
    access.event.ticketPlanFingerprint === (await computeTicketFingerprint(db, eventId));
  return NextResponse.json({ plan, inSync });
}

/** 套用售票精靈：依答案建立／更新活動的票價時段、區塊、票券、互斥與折扣碼 */
export async function PUT(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return apiError("apiErrors.common.notLoggedIn", 401);

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return apiError("eventApiErrors.invalidEventId", 400);
  }

  const access = await requireEventAdmin(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const plan = parseTicketPlan(body.plan);
  if (!plan) {
    return apiError("eventApiErrors.ticketPlan.invalid", 400);
  }

  const saved = await applyTicketPlan(eventId, plan);
  return NextResponse.json({ plan: saved, inSync: true });
}
