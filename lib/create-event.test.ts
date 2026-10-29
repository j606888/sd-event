import { describe, expect, it } from "vitest";
import {
  isValidRange,
  presetRange,
  presetWeekend,
  rangeSpan,
  shiftEnd,
  taipeiToday,
} from "@/lib/create-event";

describe("taipeiToday", () => {
  it("uses the Taipei date, not UTC", () => {
    // 2026-10-29 17:30 UTC = 10/30 01:30 台北
    expect(taipeiToday(Date.parse("2026-10-29T17:30:00Z"))).toBe("2026-10-30");
  });
});

describe("presetWeekend", () => {
  it("starts looking four weeks out when no date is picked yet", () => {
    // 2026-10-29 是週四 → 四週後 11/26（週四）→ 那週的週六 11/28
    expect(presetWeekend(null, "2026-10-29")).toBe("2026-11-28");
  });

  it("keeps the same weekend for a Friday, Saturday or Sunday start", () => {
    expect(presetWeekend("2026-12-11", "2026-10-29")).toBe("2026-12-12");
    expect(presetWeekend("2026-12-12", "2026-10-29")).toBe("2026-12-12");
    expect(presetWeekend("2026-12-13", "2026-10-29")).toBe("2026-12-12");
  });

  it("moves a weekday start to the coming Saturday", () => {
    expect(presetWeekend("2026-12-08", "2026-10-29")).toBe("2026-12-12");
  });
});

describe("presetRange", () => {
  it("builds each preset around the Saturday", () => {
    expect(presetRange("night", "2026-12-12")).toEqual({
      startAt: "2026-12-12T20:00",
      endAt: "2026-12-13T00:00",
    });
    expect(presetRange("weekend", "2026-12-12")).toEqual({
      startAt: "2026-12-12T14:00",
      endAt: "2026-12-13T23:00",
    });
    expect(presetRange("three", "2026-12-12")).toEqual({
      startAt: "2026-12-11T20:00",
      endAt: "2026-12-13T23:00",
    });
  });

  it("crosses month boundaries", () => {
    expect(presetRange("three", "2027-01-02")).toEqual({
      startAt: "2027-01-01T20:00",
      endAt: "2027-01-03T23:00",
    });
  });
});

describe("rangeSpan", () => {
  it("treats a party ending before 6am the next day as one night", () => {
    expect(rangeSpan("2026-12-12T20:00", "2026-12-13T00:00")).toEqual({ overnight: true });
    expect(rangeSpan("2026-12-12T21:00", "2026-12-13T03:00")).toEqual({ overnight: true });
  });

  it("counts calendar days otherwise", () => {
    expect(rangeSpan("2026-12-12T14:00", "2026-12-12T18:00")).toEqual({ overnight: false, days: 1 });
    expect(rangeSpan("2026-12-12T14:00", "2026-12-13T23:00")).toEqual({ overnight: false, days: 2 });
    expect(rangeSpan("2026-12-11T20:00", "2026-12-13T23:00")).toEqual({ overnight: false, days: 3 });
  });

  it("returns null when the end is not after the start", () => {
    expect(rangeSpan("2026-12-12T20:00", "2026-12-12T20:00")).toBeNull();
    expect(isValidRange("2026-12-12T20:00", "2026-12-12T19:00")).toBe(false);
    expect(isValidRange("", "2026-12-12T19:00")).toBe(false);
  });
});

describe("shiftEnd", () => {
  it("keeps the event length when the start moves", () => {
    expect(shiftEnd("2026-12-12T14:00", "2026-12-19T14:00", "2026-12-13T23:00")).toBe("2026-12-20T23:00");
    expect(shiftEnd("2026-12-12T20:00", "2026-12-12T21:30", "2026-12-13T00:00")).toBe("2026-12-13T01:30");
  });

  it("leaves the end alone when either value is incomplete", () => {
    expect(shiftEnd("", "2026-12-19T14:00", "2026-12-13T23:00")).toBe("2026-12-13T23:00");
  });
});
