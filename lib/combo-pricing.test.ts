import { describe, expect, it } from "vitest";
import {
  priceSelection,
  mergeComboItems,
  validateComboConfig,
  giftedItemIds,
  type PriceableItem,
} from "./combo-pricing";
import { computeItemsTotal } from "./seat-count";

// Workshop 區塊（組合價）：1=Arm, 2=Body, 3=Shine；Mini Social 區塊：4
const items: PriceableItem[] = [
  { id: 1, groupId: 10, unitPrice: 500 },
  { id: 2, groupId: 10, unitPrice: 500 },
  { id: 3, groupId: 10, unitPrice: 500 },
  { id: 4, groupId: 20, unitPrice: 100 },
];
const itemsById = new Map(items.map((i) => [i.id, i]));
const groups = [
  {
    id: 10,
    comboPricing: true,
    combos: [
      { count: 1, title: null, amount: 500, giftItemId: null },
      { count: 2, title: null, amount: 900, giftItemId: null },
      { count: 3, title: "Full Pass", amount: 1200, giftItemId: 4 },
    ],
  },
  { id: 20, comboPricing: false },
];

const total = (selected: number[], attendees = 1) =>
  computeItemsTotal(priceSelection(groups, itemsById, selected).lines, attendees);

describe("priceSelection", () => {
  it("prices by how many items are picked", () => {
    expect(total([1])).toBe(500);
    expect(total([2, 3])).toBe(900);
    expect(total([1, 2, 3])).toBe(1200);
  });

  it("splits the combo price evenly into integer unit amounts", () => {
    const { lines } = priceSelection(groups, itemsById, [2, 3]);
    expect(lines.map((l) => l.unitPrice)).toEqual([450, 450]);
    const full = priceSelection(groups, itemsById, [1, 2, 3]).lines.filter((l) => !l.isGift);
    expect(full.reduce((s, l) => s + l.unitPrice, 0)).toBe(1200);
  });

  it("adds non-combo items on top", () => {
    expect(total([2, 3, 4])).toBe(1000);
  });

  it("adds the gift for free and does not charge it if also picked", () => {
    const { lines } = priceSelection(groups, itemsById, [1, 2, 3]);
    const gift = lines.find((l) => l.itemId === 4);
    expect(gift).toMatchObject({ unitPrice: 0, isGift: true, comboTitle: "Full Pass" });
    expect(total([1, 2, 3, 4])).toBe(1200);
    expect(lines.filter((l) => l.comboTitle === "Full Pass")).toHaveLength(4);
  });

  it("charges per attendee", () => {
    expect(total([1, 2, 3], 2)).toBe(2400);
  });

  it("falls back to unit prices when a count has no row", () => {
    const partial = [{ ...groups[0], combos: groups[0].combos!.slice(0, 1) }, groups[1]];
    expect(
      computeItemsTotal(priceSelection(partial, itemsById, [1, 2]).lines, 1)
    ).toBe(1000);
  });

  it("reports gifted items", () => {
    expect([...giftedItemIds(groups, itemsById, [1, 2, 3])]).toEqual([4]);
    expect(giftedItemIds(groups, itemsById, [1, 2]).size).toBe(0);
  });
});

describe("mergeComboItems", () => {
  it("merges items sharing a combo title", () => {
    const merged = mergeComboItems([
      { name: "Arm", amount: 400, comboTitle: "Full Pass" },
      { name: "Body", amount: 400, comboTitle: "Full Pass" },
      { name: "Party", amount: 300, comboTitle: null },
      { name: "Shine", amount: 400, comboTitle: "Full Pass" },
    ]);
    expect(merged).toEqual([
      { name: "Full Pass（Arm、Body、Shine）", amount: 1200, comboTitle: "Full Pass" },
      { name: "Party", amount: 300, comboTitle: null },
    ]);
  });
});

describe("validateComboConfig", () => {
  const base = {
    selectionMode: "multiple",
    items: [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ],
    combos: [
      { count: 1, amount: 500, prices: [], giftItemId: null },
      { count: 2, amount: 900, prices: [], giftItemId: 4 },
    ],
    giftableItemIds: new Set([4]),
  };

  it("accepts a complete table", () => {
    expect(validateComboConfig(base)).toBeNull();
  });
  it("requires every count", () => {
    expect(validateComboConfig({ ...base, combos: base.combos.slice(0, 1) })).toEqual({
      code: "missingCount",
      values: { count: 2 },
    });
  });
  it("rejects single-select groups and bundles", () => {
    expect(validateComboConfig({ ...base, selectionMode: "single" })?.code).toBe("notMultiple");
    expect(
      validateComboConfig({ ...base, items: [{ id: 1, name: "Pair", seatCount: 2 }] })?.code
    ).toBe("bundleItem");
  });
  it("rejects unknown gifts and negative amounts", () => {
    expect(validateComboConfig({ ...base, giftableItemIds: new Set() })?.code).toBe(
      "invalidGift"
    );
    expect(
      validateComboConfig({
        ...base,
        combos: [{ ...base.combos[0], amount: -1 }, base.combos[1]],
      })?.code
    ).toBe("invalidAmount");
  });
});
