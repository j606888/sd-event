import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ publicKey: string }> };

/**
 * 依公開金鑰取得活動（不需登入）
 * 用於分享連結、對外報名頁
 */
export async function GET(_request: Request, { params }: Params) {
  const publicKey = (await params).publicKey?.trim();
  if (!publicKey) {
    return NextResponse.json({ error: "請提供公開金鑰" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.publicKey, publicKey))
    .limit(1);
  const event = rows[0];
  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  return NextResponse.json({ event });
}
