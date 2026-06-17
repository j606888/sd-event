import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventPurchaseItemGroups } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { asc, eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 取得活動的票種群組列表（依 sortOrder 升冪） */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
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
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const access = await getEventAndCheckAccess(eventId, session.userId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "請提供群組名稱 title" }, { status: 400 });
  }
  const selectionMode = body.selectionMode === "multiple" ? "multiple" : "single";
  const required = body.required !== false;
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;

  const [group] = await db
    .insert(eventPurchaseItemGroups)
    .values({ eventId, title, selectionMode, required, sortOrder })
    .returning();

  if (!group) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ group });
}
