import { describe, expect, it } from "vitest";
import { formatClockTime, formatShortTimestamp } from "./format-event-date";

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
