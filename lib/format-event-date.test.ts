import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatDate,
  formatEventDateShort,
  formatShortTimestamp,
  formatTierDeadline,
  formatTimestamp,
  getEventDateLabel,
} from "./format-event-date";

/**
 * 這些 formatter 一律以 Asia/Taipei 呈現，不受執行環境時區影響
 * （Vercel 的 Node runtime 跑 UTC）。測資刻意都用 UTC 輸入。
 */
describe("formatShortTimestamp", () => {
  it("以台北時間輸出 MM/DD HH:mm", () => {
    // 13:04Z + 8h = 台北 21:04 同日
    expect(formatShortTimestamp("2026-07-12T13:04:00Z")).toBe("07/12 21:04");
  });

  it("UTC 晚上會進位到台北的隔天", () => {
    // 16:00Z + 8h = 台北隔日 00:00，而不是同日 24:00
    expect(formatShortTimestamp("2026-07-12T16:00:00Z")).toBe("07/13 00:00");
  });

  it("跨月與跨年同樣以台北為準", () => {
    expect(formatShortTimestamp("2026-07-31T16:30:00Z")).toBe("08/01 00:30");
    expect(formatShortTimestamp("2026-12-31T16:00:00Z")).toBe("01/01 00:00");
  });

  it("月與日都補零", () => {
    expect(formatShortTimestamp("2026-01-03T01:05:00Z")).toBe("01/03 09:05");
  });
});

describe("formatClockTime", () => {
  it("只輸出台北的時分", () => {
    expect(formatClockTime("2026-07-12T12:14:00Z")).toBe("20:14");
  });

  it("午夜是 00:00 不是 24:00", () => {
    expect(formatClockTime("2026-07-12T16:00:00Z")).toBe("00:00");
  });
});

describe("English formatting", () => {
  // 2026-04-03 是週五；UTC 08:00 = 台北 16:00
  const start = "2026-04-03T08:00:00Z";
  const sameDayEnd = "2026-04-03T13:30:00Z";
  const nextDays = "2026-04-05T13:30:00Z";

  it("getEventDateLabel keeps zh-TW as the default", () => {
    expect(getEventDateLabel(start, sameDayEnd)).toBe("4月3日 (五)");
    expect(getEventDateLabel(start, nextDays)).toBe("4/03 (五) ~ 4/05 (日)");
  });

  it("getEventDateLabel in English", () => {
    expect(getEventDateLabel(start, sameDayEnd, "en")).toBe("Fri, Apr 3");
    expect(getEventDateLabel(start, nextDays, "en")).toBe("Fri, Apr 3 – Sun, Apr 5");
  });

  it("formatEventDateShort in English", () => {
    expect(formatEventDateShort(start, sameDayEnd, "en")).toBe("Fri, Apr 3, 16:00 – 21:30");
    expect(formatEventDateShort(start, nextDays, "en")).toBe("Fri, Apr 3, 16:00 – Sun, Apr 5, 21:30");
  });

  it("formatTimestamp, formatShortTimestamp and formatTierDeadline in English", () => {
    expect(formatTimestamp(start, "en")).toBe("Apr 3, 2026 16:00");
    expect(formatShortTimestamp(start, "en")).toBe("Apr 3 16:00");
    expect(formatTierDeadline(start, "en")).toBe("Apr 3");
    expect(formatDate(start, "en")).toBe("Apr 3, 2026");
    expect(formatDate(start)).toBe("2026/4/3");
  });

  it("English dates are anchored to Taipei, not UTC", () => {
    // UTC 4/2 20:00 = 台北 4/3 04:00
    expect(getEventDateLabel("2026-04-02T20:00:00Z", "2026-04-02T21:00:00Z", "en")).toBe("Fri, Apr 3");
  });
});
