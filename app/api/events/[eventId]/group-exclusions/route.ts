import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventPurchaseItemGroups, eventGroupExclusions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

async function getEventAndCheckAccess(eventId: number, userId: number) {
  const rows = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const event = rows[0];
  if (!event) return { error: NextResponse.json({ error: "找不到活動" }, { status: 404 }) };
  const forbidden = await requireTeamMember(event.teamId, userId);
  if (forbidden) return { error: forbidden };
  return { event };
}

/** 取得活動的群組互斥配對 */
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
    .select({
      groupAId: eventGroupExclusions.groupAId,
      groupBId: eventGroupExclusions.groupBId,
    })
    .from(eventGroupExclusions)
    .where(eq(eventGroupExclusions.eventId, eventId));

  return NextResponse.json({ exclusions: list });
}

/** 以完整清單取代活動的群組互斥配對（replace-all） */
export async function PUT(request: Request, { params }: Params) {
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
  const rawPairs = Array.isArray(body.exclusions) ? body.exclusions : [];

  // 此活動的合法群組 id 集合（用於驗證配對只能指向本活動群組）
  const groupRows = await db
    .select({ id: eventPurchaseItemGroups.id })
    .from(eventPurchaseItemGroups)
    .where(eq(eventPurchaseItemGroups.eventId, eventId));
  const validGroupIds = new Set(groupRows.map((g) => g.id));

  // 正規化（a < b）、去重、驗證
  const seen = new Set<string>();
  const values: { eventId: number; groupAId: number; groupBId: number }[] = [];
  for (const p of rawPairs) {
    const a = Number(p?.groupAId);
    const b = Number(p?.groupBId);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) continue;
    if (!validGroupIds.has(a) || !validGroupIds.has(b)) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}|${hi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push({ eventId, groupAId: lo, groupBId: hi });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(eventGroupExclusions)
      .where(eq(eventGroupExclusions.eventId, eventId));
    if (values.length > 0) {
      await tx.insert(eventGroupExclusions).values(values);
    }
  });

  return NextResponse.json({
    exclusions: values.map((v) => ({ groupAId: v.groupAId, groupBId: v.groupBId })),
  });
}
