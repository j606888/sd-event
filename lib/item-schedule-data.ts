/** 票券場地的 DB 查詢（server only）。整理邏輯見 lib/item-schedule.ts。 */
import { db } from "@/db";
import { eventLocations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { ScheduleLocation } from "./item-schedule";

/** 團隊的場地 id（票券只能選自己團隊的場地） */
export async function teamLocationIds(teamId: number): Promise<Set<number>> {
  const rows = await db
    .select({ id: eventLocations.id })
    .from(eventLocations)
    .where(eq(eventLocations.teamId, teamId));
  return new Set(rows.map((r) => r.id));
}

/** 依 id 載入場地（公開資訊：名稱、地址、地圖連結） */
export async function loadLocationsById(ids: (number | null | undefined)[]): Promise<Map<number, ScheduleLocation>> {
  const unique = Array.from(new Set(ids.filter((id): id is number => id != null)));
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: eventLocations.id,
      name: eventLocations.name,
      address: eventLocations.address,
      googleMapUrl: eventLocations.googleMapUrl,
    })
    .from(eventLocations)
    .where(inArray(eventLocations.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}
