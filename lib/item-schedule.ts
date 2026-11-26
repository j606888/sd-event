/**
 * 票券的上課時間與場地（eventPurchaseItems.startAt / endAt / locationId）。
 *
 * 同一個活動的不同堂課可能在不同日期、不同場地（例如週日在台南、週一在別的教室）。
 * 每張票可選填自己的時間與場地；沒填就沿用活動本身的時間與場地。
 * 這裡放前後端共用的整理邏輯：把票券依「日期 → 場地」分組，給方案介紹、憑證、確認信顯示。
 */
import { taipeiDateInput } from "./format-event-date";

export type ScheduleLocation = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

export type SchedulableItem = {
  id: number;
  name: string;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  location?: ScheduleLocation | null;
};

export type ScheduleEntry = { id: number; name: string; startAt: string | null; endAt: string | null };

export type ScheduleVenue = { location: ScheduleLocation | null; entries: ScheduleEntry[] };

export type ScheduleDay = {
  /** "YYYY-MM-DD"（台北）；null = 沒設時間的票 */
  dayKey: string | null;
  /** 當天第一堂的開始時間，用來格式化日期標題 */
  startAt: string | null;
  venues: ScheduleVenue[];
};

const toIso = (v: string | Date | null | undefined): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : v;

/** 有沒有任何一張票自己設了時間或場地（沒有就不顯示課程時間表） */
export function hasItemSchedule(items: SchedulableItem[]): boolean {
  return items.some((i) => i.startAt != null || i.location != null);
}

/** 票券用到的不重複場地（含沿用活動場地的票），依第一次出現的順序 */
export function distinctVenues(
  items: SchedulableItem[],
  eventLocation: ScheduleLocation | null
): ScheduleLocation[] {
  const seen = new Map<number, ScheduleLocation>();
  for (const item of items) {
    const loc = item.location ?? eventLocation;
    if (loc && !seen.has(loc.id)) seen.set(loc.id, loc);
  }
  return Array.from(seen.values());
}

/**
 * 依「日期 → 場地」分組。只納入自己設了時間或場地的票；
 * 有時間沒場地的票用活動場地，沒時間的票放在最後一組（dayKey = null）。
 */
export function buildItemSchedule(
  items: SchedulableItem[],
  eventLocation: ScheduleLocation | null
): ScheduleDay[] {
  const scheduled = items
    .filter((i) => i.startAt != null || i.location != null)
    .map((i) => ({
      id: i.id,
      name: i.name,
      startAt: toIso(i.startAt),
      endAt: toIso(i.endAt),
      location: i.location ?? eventLocation,
    }))
    .sort((a, b) => {
      if (a.startAt == null || b.startAt == null) return a.startAt == null ? (b.startAt == null ? 0 : 1) : -1;
      return a.startAt.localeCompare(b.startAt);
    });

  const days: ScheduleDay[] = [];
  for (const entry of scheduled) {
    const dayKey = entry.startAt ? taipeiDateInput(entry.startAt) : null;
    let day = days.find((d) => d.dayKey === dayKey);
    if (!day) {
      day = { dayKey, startAt: entry.startAt, venues: [] };
      days.push(day);
    }
    const locId = entry.location?.id ?? null;
    let venue = day.venues.find((v) => (v.location?.id ?? null) === locId);
    if (!venue) {
      venue = { location: entry.location, entries: [] };
      day.venues.push(venue);
    }
    venue.entries.push({ id: entry.id, name: entry.name, startAt: entry.startAt, endAt: entry.endAt });
  }
  return days;
}

export type ItemScheduleInput = {
  startAt?: Date | null;
  endAt?: Date | null;
  locationId?: number | null;
};

export type ItemScheduleError = "scheduleIncomplete" | "scheduleEndBeforeStart" | "locationInvalid";

/**
 * 解析 API body 的 startAt / endAt / locationId。沒帶的欄位不動（PATCH 用）。
 * startAt、endAt 要同時有值或同時清空；locationId 要屬於 allowedLocationIds（同團隊）。
 */
export function parseItemScheduleInput(
  body: Record<string, unknown>,
  allowedLocationIds: Set<number>
): { value: ItemScheduleInput } | { error: ItemScheduleError } {
  const value: ItemScheduleInput = {};
  const hasStart = "startAt" in body;
  const hasEnd = "endAt" in body;
  if (hasStart || hasEnd) {
    const parse = (raw: unknown): Date | null | undefined => {
      if (raw == null || raw === "") return null;
      if (typeof raw !== "string") return undefined;
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const start = parse(body.startAt);
    const end = parse(body.endAt);
    if (start === undefined || end === undefined || (start == null) !== (end == null)) {
      return { error: "scheduleIncomplete" };
    }
    if (start && end && end.getTime() <= start.getTime()) {
      return { error: "scheduleEndBeforeStart" };
    }
    value.startAt = start;
    value.endAt = end;
  }
  if ("locationId" in body) {
    if (body.locationId == null || body.locationId === "") {
      value.locationId = null;
    } else {
      const id = Number(body.locationId);
      if (!Number.isInteger(id) || !allowedLocationIds.has(id)) return { error: "locationInvalid" };
      value.locationId = id;
    }
  }
  return { value };
}
