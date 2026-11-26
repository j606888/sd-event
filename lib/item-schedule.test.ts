import { describe, expect, it } from "vitest";
import {
  buildItemSchedule,
  distinctVenues,
  hasItemSchedule,
  parseItemScheduleInput,
} from "./item-schedule";

const tainan = { id: 1, name: "台南教室", address: null, googleMapUrl: null };
const other = { id: 2, name: "週一教室", address: null, googleMapUrl: null };
const eventLoc = { id: 9, name: "活動場地", address: null, googleMapUrl: null };

const items = [
  { id: 3, name: "Class 3", startAt: "2026-11-30T11:30:00.000Z", endAt: "2026-11-30T13:00:00.000Z", location: other },
  { id: 1, name: "Class 1", startAt: "2026-11-29T06:00:00.000Z", endAt: "2026-11-29T07:30:00.000Z", location: tainan },
  { id: 2, name: "Class 2", startAt: "2026-11-29T08:00:00.000Z", endAt: "2026-11-29T09:30:00.000Z", location: tainan },
  { id: 4, name: "Mini Social", startAt: null, endAt: null, location: null },
];

describe("buildItemSchedule", () => {
  it("groups scheduled items by Taipei day then venue, sorted by time", () => {
    const days = buildItemSchedule(items, eventLoc);
    expect(days.map((d) => d.dayKey)).toEqual(["2026-11-29", "2026-11-30"]);
    expect(days[0].venues).toHaveLength(1);
    expect(days[0].venues[0].location?.id).toBe(1);
    expect(days[0].venues[0].entries.map((e) => e.name)).toEqual(["Class 1", "Class 2"]);
    expect(days[1].venues[0].location?.id).toBe(2);
  });

  it("falls back to the event venue for items with a time but no venue", () => {
    const days = buildItemSchedule(
      [{ id: 5, name: "X", startAt: "2026-11-29T06:00:00.000Z", endAt: "2026-11-29T07:00:00.000Z", location: null }],
      eventLoc
    );
    expect(days[0].venues[0].location?.id).toBe(9);
  });

  it("puts venue-only items in a trailing undated group", () => {
    const days = buildItemSchedule([...items, { id: 6, name: "Y", location: other }], eventLoc);
    expect(days.at(-1)?.dayKey).toBeNull();
    expect(days.at(-1)?.venues[0].entries[0].name).toBe("Y");
  });
});

describe("hasItemSchedule / distinctVenues", () => {
  it("detects schedule and counts the event venue for unscheduled items", () => {
    expect(hasItemSchedule([{ id: 1, name: "a" }])).toBe(false);
    expect(hasItemSchedule(items)).toBe(true);
    expect(distinctVenues(items, eventLoc).map((v) => v.id)).toEqual([2, 1, 9]);
  });
});

describe("parseItemScheduleInput", () => {
  const allowed = new Set([1, 2]);
  it("accepts a full time range and a team venue", () => {
    const r = parseItemScheduleInput(
      { startAt: "2026-11-29T06:00:00.000Z", endAt: "2026-11-29T07:30:00.000Z", locationId: 1 },
      allowed
    );
    expect("value" in r && r.value.locationId).toBe(1);
  });
  it("clears with nulls and leaves untouched fields out", () => {
    const r = parseItemScheduleInput({ startAt: null, endAt: null }, allowed);
    expect(r).toEqual({ value: { startAt: null, endAt: null } });
  });
  it("rejects half-filled, reversed and foreign venues", () => {
    expect(parseItemScheduleInput({ startAt: "2026-11-29T06:00:00.000Z", endAt: null }, allowed)).toEqual({ error: "scheduleIncomplete" });
    expect(
      parseItemScheduleInput({ startAt: "2026-11-29T07:00:00.000Z", endAt: "2026-11-29T06:00:00.000Z" }, allowed)
    ).toEqual({ error: "scheduleEndBeforeStart" });
    expect(parseItemScheduleInput({ locationId: 99 }, allowed)).toEqual({ error: "locationInvalid" });
  });
});
