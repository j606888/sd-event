import { describe, expect, it } from "vitest";
import {
  findFlaggedShortfall,
  minFlaggedOf,
  normalizeFlagLabel,
  requiredFlaggedCount,
} from "./attendee-flag";

describe("normalizeFlagLabel", () => {
  it("treats blank labels as unset", () => {
    expect(normalizeFlagLabel(null)).toBeNull();
    expect(normalizeFlagLabel("   ")).toBeNull();
    expect(normalizeFlagLabel(" 參加伸展台比賽 ")).toBe("參加伸展台比賽");
  });
});

describe("minFlaggedOf", () => {
  it("treats missing / invalid values as 0", () => {
    expect(minFlaggedOf({})).toBe(0);
    expect(minFlaggedOf({ minFlagged: null })).toBe(0);
    expect(minFlaggedOf({ minFlagged: -1 })).toBe(0);
    expect(minFlaggedOf({ minFlagged: 1.5 })).toBe(0);
    expect(minFlaggedOf({ minFlagged: 1 })).toBe(1);
  });
});

describe("requiredFlaggedCount", () => {
  it("returns the strictest requirement", () => {
    expect(requiredFlaggedCount([])).toBe(0);
    expect(requiredFlaggedCount([{ minFlagged: 1 }, { minFlagged: 2 }, {}])).toBe(2);
  });
});

describe("findFlaggedShortfall", () => {
  const pair = { name: "1+1 早鳥優惠票", minFlagged: 1 };

  it("passes when enough attendees are flagged", () => {
    expect(findFlaggedShortfall([pair], 1, "參加伸展台比賽")).toBeNull();
    expect(findFlaggedShortfall([pair], 2, "參加伸展台比賽")).toBeNull();
  });

  it("fails when too few attendees are flagged", () => {
    expect(findFlaggedShortfall([pair], 0, "參加伸展台比賽")).toEqual({
      item: "1+1 早鳥優惠票",
      required: 1,
      label: "參加伸展台比賽",
    });
  });

  it("skips validation when the event has no label", () => {
    expect(findFlaggedShortfall([pair], 0, null)).toBeNull();
    expect(findFlaggedShortfall([pair], 0, "  ")).toBeNull();
  });

  it("ignores tickets without a requirement", () => {
    expect(findFlaggedShortfall([{ name: "純舞會" }], 0, "參加伸展台比賽")).toBeNull();
  });
});
