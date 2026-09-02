import { describe, expect, it } from "vitest";
import {
  remapPricesAfterTierRemoval,
  shiftPricesAfterTierInsert,
  type TierPriceRef,
} from "./ticket-draft-prices";

/** create 模式：時段還沒存檔，價格用 tierDraftIndex 指涉 */
const draftPrices: TierPriceRef[] = [
  { tierDraftIndex: 0, amount: 3000 },
  { tierDraftIndex: 1, amount: 3500 },
  { tierDraftIndex: 2, amount: 4000 },
  { tierDraftIndex: 3, amount: 4500 },
];

/** edit 模式：時段已存檔，價格用 tierId 指涉 */
const savedPrices: TierPriceRef[] = [
  { tierId: 10, amount: 3000 },
  { tierId: 11, amount: 3500 },
  { tierId: 12, amount: 4500 },
];

describe("remapPricesAfterTierRemoval — create 模式（草稿時段）", () => {
  /**
   * 迴歸測試：舊版的濾除條件是
   *   `p.tierDraftIndex !== index && p.tierId !== tier?.id`
   * create 模式下 tierId 與 tier.id 都是 undefined，`undefined !== undefined` 為 false，
   * 於是刪任何一段都會把該項目的**所有**時段價一起清掉。
   */
  it("只刪掉被移除那一段的價格，其餘保留", () => {
    const result = remapPricesAfterTierRemoval(draftPrices, 1, undefined);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.amount)).toEqual([3000, 4000, 4500]);
  });

  it("後面時段的 draft index 往前移一格，價格不會綁錯段", () => {
    const result = remapPricesAfterTierRemoval(draftPrices, 1, undefined);
    expect(result).toEqual([
      { tierDraftIndex: 0, amount: 3000 },
      { tierDraftIndex: 1, amount: 4000 },
      { tierDraftIndex: 2, amount: 4500 },
    ]);
  });

  it("刪第一段", () => {
    expect(remapPricesAfterTierRemoval(draftPrices, 0, undefined)).toEqual([
      { tierDraftIndex: 0, amount: 3500 },
      { tierDraftIndex: 1, amount: 4000 },
      { tierDraftIndex: 2, amount: 4500 },
    ]);
  });

  it("刪最後一段時前面的都不動", () => {
    expect(remapPricesAfterTierRemoval(draftPrices, 3, undefined)).toEqual([
      { tierDraftIndex: 0, amount: 3000 },
      { tierDraftIndex: 1, amount: 3500 },
      { tierDraftIndex: 2, amount: 4000 },
    ]);
  });

  it("項目本來就沒有時段價時回空陣列", () => {
    expect(remapPricesAfterTierRemoval([], 1, undefined)).toEqual([]);
  });
});

describe("remapPricesAfterTierRemoval — edit 模式（已存檔時段）", () => {
  it("以 tierId 比對，只刪掉該時段的價格", () => {
    expect(remapPricesAfterTierRemoval(savedPrices, 1, 11)).toEqual([
      { tierId: 10, amount: 3000 },
      { tierId: 12, amount: 4500 },
    ]);
  });

  it("刪到不存在的 tierId 時全部保留", () => {
    expect(remapPricesAfterTierRemoval(savedPrices, 1, 99)).toEqual(savedPrices);
  });
});

describe("shiftPricesAfterTierInsert", () => {
  it("插入位置之後的草稿價格往後移一格", () => {
    expect(shiftPricesAfterTierInsert(draftPrices, 1)).toEqual([
      { tierDraftIndex: 0, amount: 3000 },
      { tierDraftIndex: 2, amount: 3500 },
      { tierDraftIndex: 3, amount: 4000 },
      { tierDraftIndex: 4, amount: 4500 },
    ]);
  });

  it("已存檔的價格（只有 tierId）不受影響", () => {
    expect(shiftPricesAfterTierInsert(savedPrices, 1)).toEqual(savedPrices);
  });
});
