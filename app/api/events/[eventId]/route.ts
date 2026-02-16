import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/** 取得單一活動（需為該團隊成員） */
export async function GET(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = rows[0];
  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  return NextResponse.json({ event });
}

/** 更新活動（草稿欄位） */
export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const rows = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(existing.teamId, session.userId);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const updates: Partial<{
    title: string;
    description: string | null;
    coverUrl: string | null;
    startAt: Date;
    endAt: Date;
    locationId: number | null;
    organizerId: number | null;
    bankInfoId: number | null;
    allowMultiplePurchase: boolean;
    status: "draft" | "published";
  }> = {};

  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description === null ? null : String(body.description);
  if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl === null ? null : String(body.coverUrl);
  if (body.startAt != null) updates.startAt = new Date(body.startAt);
  if (body.endAt != null) updates.endAt = new Date(body.endAt);
  if (body.locationId !== undefined) updates.locationId = body.locationId == null ? null : Number(body.locationId);
  if (body.organizerId !== undefined) updates.organizerId = body.organizerId == null ? null : Number(body.organizerId);
  if (body.bankInfoId !== undefined) updates.bankInfoId = body.bankInfoId == null ? null : Number(body.bankInfoId);
  if (typeof body.allowMultiplePurchase === "boolean") updates.allowMultiplePurchase = body.allowMultiplePurchase;
  if (body.status === "draft" || body.status === "published") updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    const [e] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    return NextResponse.json({ event: e });
  }

  const [updated] = await db
    .update(events)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return NextResponse.json({ event: updated });
}

/** 刪除活動（需為該團隊成員） */
export async function DELETE(_request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const rows = await db
    .select({ teamId: events.teamId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(existing.teamId, session.userId);
  if (forbidden) return forbidden;

  await db.delete(events).where(eq(events.id, eventId));
  return NextResponse.json({ ok: true });
}
