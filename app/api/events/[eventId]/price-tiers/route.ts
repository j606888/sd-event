import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventPriceTiers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { endOfDayFromDateInput } from "@/lib/pricing";
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

/** 取得活動的票價時段列表（依 sortOrder 升冪） */
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
    .from(eventPriceTiers)
    .where(eq(eventPriceTiers.eventId, eventId))
    .orderBy(asc(eventPriceTiers.sortOrder));

  return NextResponse.json({ priceTiers: list });
}

/** 新增票價時段 */
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "請提供時段名稱 name" }, { status: 400 });
  }
  const endsAt = endOfDayFromDateInput(
    typeof body.endsAt === "string" ? body.endsAt : null
  );
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;

  const [tier] = await db
    .insert(eventPriceTiers)
    .values({ eventId, name, endsAt, sortOrder })
    .returning();

  if (!tier) {
    return NextResponse.json({ error: "新增失敗" }, { status: 500 });
  }

  return NextResponse.json({ priceTier: tier });
}
