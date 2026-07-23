import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  eventAttendees,
  eventLocations,
  eventPurchaseItemGroups,
  eventPurchaseItems,
  eventPriceTiers,
  eventRegistrations,
  eventRegistrationPurchaseItems,
  organizers,
  teams,
  users,
} from "@/db/schema";
import { requireSuperAdmin } from "@/lib/api-auth";
import { asc, desc, eq, inArray } from "drizzle-orm";

type Params = { params: Promise<{ eventId: string }> };

/** 總管理員唯讀檢視單一活動（不需模擬登入、不需為團隊成員） */
export async function GET(_request: Request, { params }: Params) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const eventId = Number((await params).eventId);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "無效的 eventId" }, { status: 400 });
  }

  const [event] = await db
    .select({
      event: events,
      teamName: teams.name,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      locationName: eventLocations.name,
      organizerName: organizers.name,
    })
    .from(events)
    .innerJoin(teams, eq(teams.id, events.teamId))
    .innerJoin(users, eq(users.id, events.userId))
    .leftJoin(eventLocations, eq(eventLocations.id, events.locationId))
    .leftJoin(organizers, eq(organizers.id, events.organizerId))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "找不到活動" }, { status: 404 });
  }

  const [groups, items, tiers, registrations] = await Promise.all([
    db
      .select()
      .from(eventPurchaseItemGroups)
      .where(eq(eventPurchaseItemGroups.eventId, eventId))
      .orderBy(asc(eventPurchaseItemGroups.sortOrder)),
    db
      .select()
      .from(eventPurchaseItems)
      .where(eq(eventPurchaseItems.eventId, eventId))
      .orderBy(asc(eventPurchaseItems.sortOrder)),
    db
      .select()
      .from(eventPriceTiers)
      .where(eq(eventPriceTiers.eventId, eventId))
      .orderBy(asc(eventPriceTiers.sortOrder)),
    db
      .select({
        id: eventRegistrations.id,
        registrationKey: eventRegistrations.registrationKey,
        contactName: eventRegistrations.contactName,
        contactEmail: eventRegistrations.contactEmail,
        contactPhone: eventRegistrations.contactPhone,
        source: eventRegistrations.source,
        paymentMethod: eventRegistrations.paymentMethod,
        paymentStatus: eventRegistrations.paymentStatus,
        totalAmount: eventRegistrations.totalAmount,
        discountAmount: eventRegistrations.discountAmount,
        couponCode: eventRegistrations.couponCode,
        hidden: eventRegistrations.hidden,
        createdAt: eventRegistrations.createdAt,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.createdAt)),
  ]);

  const registrationIds = registrations.map((r) => r.id);

  const [attendees, regItems] = await Promise.all([
    registrationIds.length > 0
      ? db
          .select()
          .from(eventAttendees)
          .where(inArray(eventAttendees.registrationId, registrationIds))
      : Promise.resolve([]),
    registrationIds.length > 0
      ? db
          .select()
          .from(eventRegistrationPurchaseItems)
          .where(
            inArray(
              eventRegistrationPurchaseItems.registrationId,
              registrationIds
            )
          )
      : Promise.resolve([]),
  ]);

  const itemNameMap = new Map(items.map((i) => [i.id, i.name]));

  const stats = {
    registrationCount: registrations.length,
    attendeeCount: attendees.length,
    checkedInCount: attendees.filter((a) => a.checkedIn).length,
    leaderCount: attendees.filter((a) => a.role === "Leader").length,
    followerCount: attendees.filter((a) => a.role === "Follower").length,
    notSureCount: attendees.filter(
      (a) => a.role !== "Leader" && a.role !== "Follower"
    ).length,
    revenue: registrations
      .filter((r) => !r.hidden)
      .reduce((sum, r) => sum + r.totalAmount, 0),
    confirmedRevenue: registrations
      .filter((r) => !r.hidden && r.paymentStatus === "confirmed")
      .reduce((sum, r) => sum + r.totalAmount, 0),
  };

  return NextResponse.json({
    event: event.event,
    meta: {
      teamName: event.teamName,
      owner: {
        id: event.ownerId,
        name: event.ownerName,
        email: event.ownerEmail,
      },
      locationName: event.locationName,
      organizerName: event.organizerName,
    },
    groups,
    items,
    tiers,
    stats,
    registrations: registrations.map((r) => ({
      ...r,
      attendees: attendees.filter((a) => a.registrationId === r.id),
      purchaseItems: regItems
        .filter((i) => i.registrationId === r.id)
        .map((i) => ({
          ...i,
          name: itemNameMap.get(i.purchaseItemId) ?? "（已刪除）",
        })),
    })),
  });
}
