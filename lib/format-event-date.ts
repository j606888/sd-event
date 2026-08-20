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
  // 跨日活動須帶出結束日期，避免摘要看起來只有一天
  const s = getDatePartsInTz(start);
  const e = getDatePartsInTz(end);
  const isSameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  if (isSameDay) {
    return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
  }
  return `${fmt(start)} ${timeFmt(start)} ~ ${fmt(end)} ${timeFmt(end)}`;
}

/**
 * Format a single ISO timestamp (e.g. createdAt) in Asia/Taipei timezone.
 * Output: 2024年01月03日 3:45 PM
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const { year, month, day } = getDatePartsInTz(date);
  const { hour, minute } = getTimePartsInTz(date);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${year}年${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日 ${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

/** 票價時段截止日（M/D，Asia/Taipei），用於「早鳥價至 7/31 止」等提示 */
export function formatTierDeadline(iso: string): string {
  const p = getDatePartsInTz(new Date(iso));
  return `${p.month}/${p.day}`;
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
  // 跨日活動須帶出結束日期，避免摘要看起來只有一天
  const s = getDatePartsInTz(start);
  const e = getDatePartsInTz(end);
  const isSameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  if (isSameDay) {
    return `${fmt(start)} ${timeFmt(start)} ~ ${timeFmt(end)}`;
  }
  return `${fmt(start)} ${timeFmt(start)} ~ ${fmt(end)} ${timeFmt(end)}`;
}

/**
 * 台北固定偏移。台灣自 1979 年起不再實施日光節約時間，
 * 全年恆為 UTC+8，因此可以安全地用常數字串當作 ISO 後綴。
 */
export const TAIPEI_OFFSET = "+08:00";

/** ISO 時間 → date input 的 "YYYY-MM-DD"（Asia/Taipei） */
export function taipeiDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = getDatePartsInTz(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ISO 時間 → datetime-local input 的 "YYYY-MM-DDTHH:mm"（Asia/Taipei） */
export function taipeiDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = getDatePartsInTz(d);
  const { hour, minute } = getTimePartsInTz(d);
  return (
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` +
    `T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  );
}

/**
 * datetime-local input 的 "YYYY-MM-DDTHH:mm" → ISO instant，
 * 一律以台北時間解讀，不受執行環境時區影響。無效輸入回傳 null。
 */
export function fromTaipeiDateTimeLocal(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const d = new Date(`${value.trim()}:00${TAIPEI_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
