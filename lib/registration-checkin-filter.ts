import { and, eq, exists, notExists, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, eventRegistrations } from "@/db/schema";
import type { CheckInFilter } from "@/lib/registration-list-filters";

const CHECK_IN_FILTERS: readonly CheckInFilter[] = [
  "all",
  "none",
  "partial",
  "all_entered",
  "not_all",
];

/** 解析 `checkInFilter` query param；不認得的值視為未篩選。 */
export function parseCheckInFilterParam(raw: string | null): CheckInFilter {
  return (CHECK_IN_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as CheckInFilter)
    : "all";
}

/**
 * 入場狀態的 where 條件。
 *
 * 必須在 SQL 做而不是查完再用 JS 濾：列表是分頁的，事後過濾會讓每頁筆數忽多忽少、
 * 總筆數也對不上 —— 而「還沒入場的人」正是門口最常開的篩選。
 * 沒有參加者的報名不算任何一種入場狀態（沿用原本列表 API 的判斷）。
 */
export function registrationMatchesCheckIn(filter: CheckInFilter): SQL | undefined {
  const attendees = (checkedIn?: boolean) =>
    db
      .select({ one: eventAttendees.id })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.registrationId, eventRegistrations.id),
          checkedIn === undefined ? undefined : eq(eventAttendees.checkedIn, checkedIn)
        )
      );

  switch (filter) {
    case "none":
      return and(exists(attendees()), notExists(attendees(true)));
    case "partial":
      return and(exists(attendees(true)), exists(attendees(false)));
    case "all_entered":
      return and(exists(attendees()), notExists(attendees(false)));
    case "not_all":
      return exists(attendees(false));
    default:
      return undefined;
  }
}
