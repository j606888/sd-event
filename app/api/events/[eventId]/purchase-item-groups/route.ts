import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventPurchaseItemGroups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { requireEventAdmin } from "@/lib/event-access";
import { apiError } from "@/lib/api-error";
import { asc, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };


/** 取得活動的票種群組列表（依 sortOrder 升冪） */
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

  const list = await db
    .select()
    .from(eventPurchaseItemGroups)
    .where(eq(eventPurchaseItemGroups.eventId, eventId))
    .orderBy(asc(eventPurchaseItemGroups.sortOrder));

  return NextResponse.json({ groups: list });
}

/** 新增票種群組 */
export async function POST(request: Request, { params }: Params) {
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return apiError("eventApiErrors.purchaseItemGroups.titleRequired", 400);
  }
  const selectionMode = body.selectionMode === "multiple" ? "multiple" : "single";
  const required = body.required !== false;
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;

  const [group] = await db
    .insert(eventPurchaseItemGroups)
    .values({ eventId, title, selectionMode, required, sortOrder })
    .returning();

  if (!group) {
    return apiError("eventApiErrors.createFailed", 500);
  }

  return NextResponse.json({ group });
}
