import type { EventType } from "@/lib/event-templates";

/** 建立活動精靈的步驟（順序即顯示順序） */
export const CREATE_STEPS = [
  "type",
  "title",
  "dates",
  "location",
  "cover",
  "description",
  "organizer",
  "payment",
  "tickets",
  "review",
] as const;

export type CreateStep = (typeof CREATE_STEPS)[number];

/**
 * 每一步分三種：
 * - required：不能跳過，存草稿至少要有這幾個
 * - publish：可以「之後再填」，但沒補上不能發布
 * - optional：跳過也能發布
 */
export type StepKind = "required" | "publish" | "optional";

export const STEP_KIND: Record<Exclude<CreateStep, "review">, StepKind> = {
  type: "required",
  title: "required",
  dates: "required",
  location: "publish",
  cover: "optional",
  description: "optional",
  organizer: "optional",
  payment: "publish",
  tickets: "publish",
};

export const PUBLISH_STEPS = ["location", "payment", "tickets"] as const satisfies CreateStep[];
export const OPTIONAL_STEPS = ["cover", "description", "organizer"] as const satisfies CreateStep[];

export const TITLE_MAX_LENGTH = 60;

/** 日期的常見選項；選了活動類型會先帶入對應的那個 */
export const DATE_PRESETS = ["night", "weekend", "three"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_BY_TYPE: Record<EventType, DatePreset> = {
  Party: "night",
  Workshop: "weekend",
  Festival: "three",
};

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "YYYY-MM-DD"（台北日期）往後 n 天 */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00+08:00`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = 週日 … 6 = 週六 */
function weekday(date: string): number {
  return new Date(`${date}T12:00:00+08:00`).getUTCDay();
}

function saturdayOnOrAfter(date: string): string {
  return addDays(date, (6 - weekday(date) + 7) % 7);
}

/** 台北「今天」的 "YYYY-MM-DD" */
export function taipeiToday(now = Date.now()): string {
  return new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * 日期選項要落在哪個週末（回傳那個週六）：已經選了開始日就沿用同一個週末
 * （週五開始、週日開始都算同一個週末）；還沒選就從四週後找第一個週六，早鳥才有時間賣。
 */
export function presetWeekend(startDate: string | null, today: string): string {
  if (startDate && DATE_RE.test(startDate)) return saturdayOnOrAfter(addDays(startDate, -1));
  return saturdayOnOrAfter(addDays(today, 28));
}

/** 日期選項的起訖（datetime-local，台北時間） */
export function presetRange(preset: DatePreset, saturday: string): { startAt: string; endAt: string } {
  const sunday = addDays(saturday, 1);
  switch (preset) {
    case "night":
      return { startAt: `${saturday}T20:00`, endAt: `${sunday}T00:00` };
    case "weekend":
      return { startAt: `${saturday}T14:00`, endAt: `${sunday}T23:00` };
    case "three":
      return { startAt: `${addDays(saturday, -1)}T20:00`, endAt: `${sunday}T23:00` };
  }
}

/** 結束要晚於開始（兩個都是 datetime-local） */
export function isValidRange(startAt: string, endAt: string): boolean {
  return DATETIME_RE.test(startAt) && DATETIME_RE.test(endAt) && endAt > startAt;
}

/**
 * 活動有多長：隔天清晨 6 點前結束算「單晚」，其餘算涵蓋幾個日曆天。
 * 起訖不合法時回傳 null。
 */
export function rangeSpan(startAt: string, endAt: string): { overnight: true } | { overnight: false; days: number } | null {
  if (!isValidRange(startAt, endAt)) return null;
  const startDate = startAt.slice(0, 10);
  const endDate = endAt.slice(0, 10);
  const diff = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS);
  if (diff === 1 && endAt.slice(11) <= "06:00") return { overnight: true };
  return { overnight: false, days: diff + 1 };
}

/** 改開始時間時，結束時間跟著平移，活動長度不變 */
export function shiftEnd(prevStart: string, nextStart: string, endAt: string): string {
  if (!DATETIME_RE.test(prevStart) || !DATETIME_RE.test(nextStart) || !DATETIME_RE.test(endAt)) {
    return endAt;
  }
  const toMs = (v: string) => Date.parse(`${v}:00+08:00`);
  const shifted = toMs(endAt) + (toMs(nextStart) - toMs(prevStart));
  return new Date(shifted + 8 * 3_600_000).toISOString().slice(0, 16);
}
