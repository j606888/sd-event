import { describe, expect, it } from "vitest";
import {
  computeItemsTotal,
  requiredAttendeeCount,
  findSeatCountMismatch,
  seatCountOf,
} from "./seat-count";

describe("seatCountOf", () => {
  it("treats missing / invalid values as 1", () => {
    expect(seatCountOf({})).toBe(1);
    expect(seatCountOf({ seatCount: null })).toBe(1);
    expect(seatCountOf({ seatCount: 0 })).toBe(1);
    expect(seatCountOf({ seatCount: 1.5 })).toBe(1);
    expect(seatCountOf({ seatCount: 2 })).toBe(2);
  });
});

describe("computeItemsTotal", () => {
  it("multiplies regular tickets by attendee count", () => {
    expect(computeItemsTotal([{ unitPrice: 350 }], 3)).toBe(1050);
  });

  it("charges a bundle once regardless of attendee count", () => {
    expect(computeItemsTotal([{ unitPrice: 600, seatCount: 2 }], 2)).toBe(600);
  });

  it("still charges per-person add-ons on top of a bundle", () => {
    expect(
      computeItemsTotal(
        [
          { unitPrice: 600, seatCount: 2 },
          { unitPrice: 100, seatCount: 1 },
        ],
        2
      )
    ).toBe(800);
  });
});

describe("findSeatCountMismatch", () => {
  const pair = { name: "雙人票", seatCount: 2 };

  it("passes regular tickets with any attendee count", () => {
    expect(findSeatCountMismatch([{ name: "單人票" }], 5)).toBeNull();
  });

  it("requires the exact attendee count for a bundle", () => {
    expect(findSeatCountMismatch([pair], 2)).toBeNull();
    expect(findSeatCountMismatch([pair], 1)).toEqual({ item: "雙人票", required: 2, actual: 1 });
    expect(findSeatCountMismatch([pair], 3)).toEqual({ item: "雙人票", required: 2, actual: 3 });
  });

  it("rejects bundles with conflicting seat counts", () => {
    expect(
      findSeatCountMismatch([pair, { name: "三人票", seatCount: 3 }], 2)
    ).toEqual({ item: "三人票", required: 3, actual: 2 });
  });
});

describe("requiredAttendeeCount", () => {
  it("returns null without a bundle and the seat count with one", () => {
    expect(requiredAttendeeCount([{ name: "單人票" }])).toBeNull();
    expect(
      requiredAttendeeCount([{ name: "單人票" }, { name: "雙人票", seatCount: 2 }])
    ).toBe(2);
  });
});
