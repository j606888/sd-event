import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, inArray, desc } from "drizzle-orm";

/** 產生 URL 安全的公開金鑰（約 16 字元） */
function generatePublicKey(): string {
  return randomBytes(12).toString("base64url");
}

/** 取得活動列表（可選 ?teamId= 篩選，否則回傳當前使用者所屬團隊的活動） */
export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teamIdParam = searchParams.get("teamId");
  const teamId = teamIdParam ? Number(teamIdParam) : null;

  if (teamId != null) {
    if (!Number.isInteger(teamId)) {
      return NextResponse.json({ error: "無效的 teamId" }, { status: 400 });
    }
    const forbidden = await requireTeamMember(teamId, session.userId);
    if (forbidden) return forbidden;
    const list = await db
      .select({
        id: events.id,
        publicKey: events.publicKey,
        teamId: events.teamId,
        userId: events.userId,
        title: events.title,
        coverUrl: events.coverUrl,
        status: events.status,
        startAt: events.startAt,
        endAt: events.endAt,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(eq(events.teamId, teamId))
      .orderBy(desc(events.createdAt));
    return NextResponse.json({ events: list });
  }

  const myTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, session.userId));
  const teamIds = myTeams.map((r) => r.teamId);
  if (teamIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const list = await db
    .select({
      id: events.id,
      publicKey: events.publicKey,
      teamId: events.teamId,
      userId: events.userId,
      title: events.title,
      coverUrl: events.coverUrl,
      status: events.status,
      startAt: events.startAt,
      endAt: events.endAt,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(inArray(events.teamId, teamIds))
    .orderBy(desc(events.createdAt));

  return NextResponse.json({ events: list });
}

/** 建立新活動 */
export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const teamId = Number(body.teamId);
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!Number.isInteger(teamId) || !title) {
    return NextResponse.json(
      { error: "請提供有效的 teamId 與 title" },
      { status: 400 }
    );
  }

  const forbidden = await requireTeamMember(teamId, session.userId);
  if (forbidden) return forbidden;

  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : new Date();
  const description = typeof body.description === "string" ? body.description : null;
  const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl : null;
  const locationId = body.locationId != null ? Number(body.locationId) : null;
  const organizerId = body.organizerId != null ? Number(body.organizerId) : null;
  const bankInfoId = body.bankInfoId != null ? Number(body.bankInfoId) : null;
  const allowMultiplePurchase = Boolean(body.allowMultiplePurchase);
  const publicKey = generatePublicKey();

  const [event] = await db
    .insert(events)
    .values({
      publicKey,
      teamId,
      userId: session.userId,
      title,
      description,
      coverUrl,
      startAt,
      endAt,
      locationId: Number.isInteger(locationId) ? locationId : null,
      organizerId: Number.isInteger(organizerId) ? organizerId : null,
      bankInfoId: Number.isInteger(bankInfoId) ? bankInfoId : null,
      allowMultiplePurchase,
    })
    .returning({
      id: events.id,
      publicKey: events.publicKey,
      teamId: events.teamId,
      userId: events.userId,
      title: events.title,
      status: events.status,
      startAt: events.startAt,
      endAt: events.endAt,
      createdAt: events.createdAt,
    });

  if (!event) {
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  return NextResponse.json({ event });
}
