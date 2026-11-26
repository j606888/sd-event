"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatSessionDay, formatSessionTimeRange } from "@/lib/format-event-date";
import { buildItemSchedule, type SchedulableItem, type ScheduleLocation } from "@/lib/item-schedule";
import type { Locale } from "@/lib/locale";

/** 票券名稱下方的一行「11/29（日）14:00–15:30・台南 ○○教室」；沒設時間也沒設場地就不顯示 */
export function ItemSessionLine({
  item,
  showVenue = true,
  className = "text-xs text-gray-500",
}: {
  item: Pick<SchedulableItem, "startAt" | "endAt" | "location">;
  /** 整個活動只有一個場地時不必每張票都重複場地 */
  showVenue?: boolean;
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const parts: string[] = [];
  if (item.startAt && item.endAt) {
    const start = String(item.startAt);
    const end = String(item.endAt);
    parts.push(`${formatSessionDay(start, locale)} ${formatSessionTimeRange(start, end)}`);
  }
  if (showVenue && item.location) parts.push(item.location.name);
  if (parts.length === 0) return null;
  return <div className={className}>{parts.join("・")}</div>;
}

/**
 * 課程時間與地點：依日期分組，每天列出各堂課與場地（附地圖連結）。
 * 方案介紹列全部票券；入場憑證、報名成功頁只列這筆報名買到的票。
 */
export function ItemSchedule({
  items,
  eventLocation,
}: {
  items: SchedulableItem[];
  eventLocation: ScheduleLocation | null;
}) {
  const t = useTranslations("publicEvent.schedule");
  const locale = useLocale() as Locale;
  const days = buildItemSchedule(items, eventLocation);
  if (days.length === 0) return null;

  return (
    <div className="divide-y divide-gray-100">
      {days.map((day) => (
        <div key={day.dayKey ?? "undated"} className="space-y-2 py-3 first:pt-0 last:pb-0">
          <h3 className="text-sm font-semibold text-brand-strong">
            {day.startAt ? formatSessionDay(day.startAt, locale) : t("undated")}
          </h3>
          {day.venues.map((venue) => (
            <div key={venue.location?.id ?? "none"} className="space-y-1.5">
              <ul className="space-y-0.5 text-[15px] text-gray-900">
                {venue.entries.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    {entry.startAt && entry.endAt && (
                      <span className="shrink-0 tabular-nums text-gray-600">
                        {formatSessionTimeRange(entry.startAt, entry.endAt)}
                      </span>
                    )}
                    <span className="min-w-0">{entry.name}</span>
                  </li>
                ))}
              </ul>
              {venue.location && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="text-gray-900">{venue.location.name}</div>
                    {venue.location.address && (
                      <div className="text-xs text-gray-500">{venue.location.address}</div>
                    )}
                  </div>
                  {venue.location.googleMapUrl && (
                    <a
                      href={venue.location.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm text-brand-strong"
                    >
                      {t("map")}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
