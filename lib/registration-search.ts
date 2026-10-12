import { and, eq, exists, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, eventRegistrations } from "@/db/schema";

/**
 * 報名列表搜尋的 where 條件（列表 API 與 CSV 匯出共用）。
 * 比對聯絡人姓名 / Email / 電話，以及報名內任一參與者姓名（不分大小寫）。
 * 參與者用 exists 子查詢，多位參與者命中時報名也不會重複、分頁總數才正確。
 */
export function registrationMatchesSearch(search: string): SQL {
  const pattern = `%${search}%`;
  return or(
    ilike(eventRegistrations.contactName, pattern),
    ilike(eventRegistrations.contactEmail, pattern),
    ilike(eventRegistrations.contactPhone, pattern),
    exists(
      db
        .select({ one: eventAttendees.id })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.registrationId, eventRegistrations.id),
            ilike(eventAttendees.name, pattern)
          )
        )
    )
  )!;
}
