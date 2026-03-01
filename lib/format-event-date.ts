const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

const TZ = "Asia/Taipei";

/** Get date parts (year, month, day, weekday 0-6) in Asia/Taipei */
function getDatePartsInTz(d: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: weekdayMap[weekdayStr] ?? 0,
  };
}

/** Get time parts (hour 0-23, minute) in Asia/Taipei */
function getTimePartsInTz(d: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute") };
}

/**
 * 格式化日期部分 (第一列)，使用 Asia/Taipei 時區
 * 同一天: 4月3日 (五)
 * 跨天: 4/03 (五) ~ 4/05 (日)
 */
export function getEventDateLabel(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const s = getDatePartsInTz(start);
  const e = getDatePartsInTz(end);

  const isSameDay =
    s.year === e.year && s.month === e.month && s.day === e.day;

  const fmtFull = (p: ReturnType<typeof getDatePartsInTz>) =>
    `${p.month}月${p.day}日 (${WEEKDAY[p.weekday]})`;
  const fmtShort = (p: ReturnType<typeof getDatePartsInTz>) =>
    `${p.month}/${String(p.day).padStart(2, "0")} (${WEEKDAY[p.weekday]})`;

  if (isSameDay) {
    return fmtFull(s);
  }
  return `${fmtShort(s)} ~ ${fmtShort(e)}`;
}

/**
 * 格式化時間部分 (第二列)，使用 Asia/Taipei 時區
 * 顯示格式: 4:00 PM ~ 9:30 PM
 */
export function getEventTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) => {
    const { hour, minute } = getTimePartsInTz(d);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export function formatEventDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) => {
    const p = getDatePartsInTz(d);
    return `${p.month}月${p.day}日 (${WEEKDAY[p.weekday]})`;
  };
  const timeFmt = (d: Date) => {
    const { hour, minute } = getTimePartsInTz(d);
    const period = hour >= 12 ? "下午" : "上午";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${period} ${displayHour}:${String(minute).padStart(2, "0")}`;
  };
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}

export function formatEventDateShort(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) => {
    const p = getDatePartsInTz(d);
    return `${p.month}月${p.day}日 (${WEEKDAY[p.weekday]})`;
  };
  const timeFmt = (d: Date) => {
    const { hour, minute } = getTimePartsInTz(d);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
}
