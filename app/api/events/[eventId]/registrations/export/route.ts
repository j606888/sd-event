import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventRegistrations,
  eventAttendees,
  eventPurchaseItems,
  eventRegistrationPurchaseItems,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { requireAuth, requireTeamMember } from "@/lib/api-auth";
import { eq, desc, or, like, and, inArray } from "drizzle-orm";
import { matchesCheckInFilter, type CheckInFilter } from "@/lib/registration-list-filters";

type Params = { params: Promise<{ eventId: string }> };

const ROLE_LABELS: Record<string, string> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "尚未確定",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  reported: "待確認",
  confirmed: "已完成付款",
  rejected: "已退款",
};

const SOURCE_LABELS: Record<string, string> = {
  online: "線上",
  walk_in: "現場",
};

/** Wrap a value as a CSV field, escaping quotes/commas/newlines. */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 匯出活動報名為 CSV（需為該團隊成員）。
 * 沿用列表頁的搜尋與篩選條件，但不分頁，且一位參加者一列。
 */
export async function GET(request: Request, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const forbidden = await requireTeamMember(event.teamId, session.userId);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const paymentStatus = searchParams.get("paymentStatus") || "all";
  const hiddenFilter = searchParams.get("hiddenFilter") || "all";
  const checkInFilter = (searchParams.get("checkInFilter") || "all") as CheckInFilter;

  // 與列表 API 相同的 where 條件（搜尋 / 付款狀態 / 隱藏）
  const whereConditions = [eq(eventRegistrations.eventId, eventId)];

  if (search) {
    whereConditions.push(
      or(
        like(eventRegistrations.contactName, `%${search}%`),
        like(eventRegistrations.contactEmail, `%${search}%`),
        like(eventRegistrations.contactPhone, `%${search}%`)
      )!
    );
  }

  if (paymentStatus !== "all") {
    whereConditions.push(
      eq(
        eventRegistrations.paymentStatus,
        paymentStatus as "pending" | "reported" | "confirmed" | "rejected"
      )
    );
  }

  if (hiddenFilter === "non_hidden") {
    whereConditions.push(eq(eventRegistrations.hidden, false));
  } else if (hiddenFilter === "hidden") {
    whereConditions.push(eq(eventRegistrations.hidden, true));
  }

  const registrations = await db
    .select()
    .from(eventRegistrations)
    .where(and(...whereConditions))
    .orderBy(desc(eventRegistrations.createdAt));

  const registrationIds = registrations.map((r) => r.id);

  // 一次撈出所有參加者與報名項目，避免 N+1
  const attendees =
    registrationIds.length > 0
      ? await db
          .select()
          .from(eventAttendees)
          .where(inArray(eventAttendees.registrationId, registrationIds))
      : [];

  const multiItems =
    registrationIds.length > 0
      ? await db
          .select({
            registrationId: eventRegistrationPurchaseItems.registrationId,
            name: eventPurchaseItems.name,
          })
          .from(eventRegistrationPurchaseItems)
          .innerJoin(
            eventPurchaseItems,
            eq(eventRegistrationPurchaseItems.purchaseItemId, eventPurchaseItems.id)
          )
          .where(inArray(eventRegistrationPurchaseItems.registrationId, registrationIds))
      : [];

  // 舊單選模型 fallback：registration.purchaseItemId
  const singleItemIds = Array.from(
    new Set(
      registrations
        .map((r) => r.purchaseItemId)
        .filter((id): id is number => id != null)
    )
  );
  const singleItemMeta =
    singleItemIds.length > 0
      ? await db
          .select({ id: eventPurchaseItems.id, name: eventPurchaseItems.name })
          .from(eventPurchaseItems)
          .where(inArray(eventPurchaseItems.id, singleItemIds))
      : [];
  const singleItemNameById = new Map(singleItemMeta.map((m) => [m.id, m.name]));

  // 依 registrationId 聚合
  const attendeesByReg = new Map<number, typeof attendees>();
  for (const a of attendees) {
    const list = attendeesByReg.get(a.registrationId) ?? [];
    list.push(a);
    attendeesByReg.set(a.registrationId, list);
  }

  const itemNamesByReg = new Map<number, string[]>();
  for (const row of multiItems) {
    const list = itemNamesByReg.get(row.registrationId) ?? [];
    list.push(row.name);
    itemNamesByReg.set(row.registrationId, list);
  }

  const header = [
    "報名編號",
    "聯絡人",
    "電話",
    "Email",
    "參加者姓名",
    "角色",
    "報名項目",
    "金額",
    "折扣碼",
    "折抵金額",
    "付款方式",
    "付款狀態",
    "入場狀態",
    "來源",
    "報名時間",
  ];

  const lines: string[] = [header.map(csvCell).join(",")];

  for (const reg of registrations) {
    const regAttendees = attendeesByReg.get(reg.id) ?? [];

    // checkInFilter 在 JS 端套用（與列表 API 一致）
    const attendeeCount = regAttendees.length;
    const checkedInCount = regAttendees.filter((a) => a.checkedIn).length;
    if (!matchesCheckInFilter(attendeeCount, checkedInCount, checkInFilter)) {
      continue;
    }

    const itemNames =
      itemNamesByReg.get(reg.id) ??
      (reg.purchaseItemId != null && singleItemNameById.has(reg.purchaseItemId)
        ? [singleItemNameById.get(reg.purchaseItemId)!]
        : []);
    const itemLabel = itemNames.join(" / ");

    const paymentMethodLabel =
      reg.paymentMethod === "Cash" ? "現金" : reg.paymentMethod || "";
    const paymentStatusLabel =
      PAYMENT_STATUS_LABELS[reg.paymentStatus] ?? reg.paymentStatus;
    const sourceLabel = SOURCE_LABELS[reg.source] ?? reg.source;
    const createdLabel = reg.createdAt
      ? new Date(reg.createdAt).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
        })
      : "";

    // 一位參加者一列；沒有參加者的報名仍輸出一列（參加者欄留空）
    const rows = attendeeCount > 0 ? regAttendees : [null];
    for (const a of rows) {
      const checkInLabel = a ? (a.checkedIn ? "已入場" : "未入場") : "";
      lines.push(
        [
          reg.registrationKey,
          reg.contactName,
          reg.contactPhone ?? "",
          reg.contactEmail ?? "",
          a?.name ?? "",
          a ? ROLE_LABELS[a.role] ?? a.role : "",
          itemLabel,
          reg.totalAmount,
          reg.couponCode ?? "",
          reg.discountAmount > 0 ? reg.discountAmount : "",
          paymentMethodLabel,
          paymentStatusLabel,
          checkInLabel,
          sourceLabel,
          createdLabel,
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }

  // 前置 UTF-8 BOM，讓 Excel 正確辨識中文
  const csv = "﻿" + lines.join("\r\n");

  const safeTitle = (event.title || "registrations").replace(/[^\w一-龥-]+/g, "_");
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}_${datePart}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
