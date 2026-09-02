import { describe, expect, it } from "vitest";
import { endOfDayFromDateInput, type PriceTier } from "./pricing";
import {
  distributeAmount,
  resolveUnitPrices,
  validateGroupSelection,
  type GroupRow,
  type ItemRow,
} from "./registration-pricing";

const group = (
  id: number,
  title: string,
  selectionMode: "single" | "multiple",
  required: boolean
): GroupRow => ({ id, title, selectionMode, required });

const item = (id: number, groupId: number | null): ItemRow => ({ id, groupId });

describe("validateGroupSelection — 四種 selectionMode × required 組合", () => {
  const items = [item(1, 10), item(2, 10), item(3, 20), item(4, 20)];

  it("single + required：必須恰選一項", () => {
    const groups = [group(10, "課程方案", "single", true)];
    const only = items.filter((i) => i.groupId === 10);
    expect(validateGroupSelection(groups, only, [1], [])).toBeNull();
    expect(validateGroupSelection(groups, only, [], [])).toBe("請於「課程方案」選擇一項");
    expect(validateGroupSelection(groups, only, [1, 2], [])).toBe("「課程方案」僅能擇一");
  });

  it("single + optional：可以不選，但最多一項", () => {
    const groups = [group(10, "加購", "single", false)];
    const only = items.filter((i) => i.groupId === 10);
    expect(validateGroupSelection(groups, only, [], [])).toBeNull();
    expect(validateGroupSelection(groups, only, [1], [])).toBeNull();
    expect(validateGroupSelection(groups, only, [1, 2], [])).toBe("「加購」僅能擇一");
  });

  it("multiple + required：至少一項，可多項", () => {
    const groups = [group(10, "單堂課", "multiple", true)];
    const only = items.filter((i) => i.groupId === 10);
    expect(validateGroupSelection(groups, only, [], [])).toBe(
      "請於「單堂課」至少選擇一項"
    );
    expect(validateGroupSelection(groups, only, [1], [])).toBeNull();
    expect(validateGroupSelection(groups, only, [1, 2], [])).toBeNull();
  });

  it("multiple + optional：0 到多項都可以", () => {
    const groups = [group(10, "加購", "multiple", false)];
    const only = items.filter((i) => i.groupId === 10);
    expect(validateGroupSelection(groups, only, [], [])).toBeNull();
    expect(validateGroupSelection(groups, only, [1, 2], [])).toBeNull();
  });

  it("選到不屬於任何群組的項目會被擋下", () => {
    const groups = [group(10, "課程方案", "single", true)];
    expect(validateGroupSelection(groups, [item(1, null)], [1], [])).toBe(
      "無效的購買項目"
    );
    expect(validateGroupSelection(groups, [item(1, 99)], [1], [])).toBe(
      "無效的購買項目"
    );
    expect(validateGroupSelection(groups, [], [1], [])).toBe("無效的購買項目");
  });
});

describe("validateGroupSelection — 互斥", () => {
  const groups = [
    group(10, "Full Pass", "single", false),
    group(20, "單堂課", "multiple", false),
  ];
  const items = [item(1, 10), item(3, 20)];

  it("互斥的兩個群組不可同時有選取", () => {
    expect(validateGroupSelection(groups, items, [1], [{ groupAId: 10, groupBId: 20 }]))
      .toBeNull();
    expect(validateGroupSelection(groups, items, [3], [{ groupAId: 10, groupBId: 20 }]))
      .toBeNull();
    expect(
      validateGroupSelection(groups, items, [1, 3], [{ groupAId: 10, groupBId: 20 }])
    ).toBe("「Full Pass」與「單堂課」不可同時選擇");
  });

  /**
   * 票券設定的陷阱：群組 B 設為「必選」又與群組 A 互斥時，A 就永遠選不到 ——
   * 只選 A 會被 B 的必選擋下，A、B 都選會被互斥擋下。B 自己還是選得成，
   * 所以不是全盤死結，而是「A 這個群組形同不存在」。
   *
   * 前端 use-event-application-form 的 groupsSatisfied 把被鎖住的必選群組當作已滿足，
   * 會放行到送出才吃 400，所以主辦端要在設定當下就警告
   *（TicketGroupsCard 的 conflictingGroupTitles）。
   *
   * 注意 required 迴圈跑在互斥迴圈之前，所以只選 A 時回的是必選訊息、不是互斥訊息。
   */
  it("必選 + 互斥：被互斥的另一個群組永遠選不到", () => {
    const conflicting = [
      group(10, "Full Pass", "single", false),
      group(20, "單堂課", "multiple", true),
    ];
    const exclusions = [{ groupAId: 10, groupBId: 20 }];

    // 只選 Full Pass → 單堂課的必選先擋下
    expect(validateGroupSelection(conflicting, items, [1], exclusions)).toBe(
      "請於「單堂課」至少選擇一項"
    );
    // 兩個都選 → 互斥擋下
    expect(validateGroupSelection(conflicting, items, [1, 3], exclusions)).toBe(
      "「Full Pass」與「單堂課」不可同時選擇"
    );
    // 什麼都不選 → 一樣被必選擋下
    expect(validateGroupSelection(conflicting, items, [], exclusions)).toBe(
      "請於「單堂課」至少選擇一項"
    );
    // 唯一過得了的選法：只選必選的那一組，Full Pass 形同不存在
    expect(validateGroupSelection(conflicting, items, [3], exclusions)).toBeNull();
  });
});

describe("resolveUnitPrices", () => {
  const tiers: PriceTier[] = [
    { id: 1, name: "早鳥", endsAt: endOfDayFromDateInput("2026-08-01"), sortOrder: 0 },
    { id: 2, name: "現場", endsAt: null, sortOrder: 1 },
  ];
  const priceRows = [
    { purchaseItemId: 100, tierId: 1, amount: 400 },
    { purchaseItemId: 100, tierId: 2, amount: 500 },
    { purchaseItemId: 200, tierId: 1, amount: 1800 },
  ];

  it("以生效時段解析每個項目的單價", () => {
    const { activeTier, unitPriceById } = resolveUnitPrices(
      [{ id: 100, amount: 999 }],
      tiers,
      priceRows,
      new Date("2026-07-15T10:00+08:00")
    );
    expect(activeTier?.name).toBe("早鳥");
    expect(unitPriceById.get(100)).toBe(400);
  });

  it("項目在生效時段沒有列價時退回 amount", () => {
    const { activeTier, unitPriceById } = resolveUnitPrices(
      [{ id: 200, amount: 2200 }],
      tiers,
      priceRows,
      new Date("2026-09-02T10:00+08:00")
    );
    // 現場段沒有 200 的列價 → 用 item.amount
    expect(activeTier?.name).toBe("現場");
    expect(unitPriceById.get(200)).toBe(2200);
  });

  it("活動沒有時段時一律用 amount", () => {
    const { activeTier, unitPriceById } = resolveUnitPrices(
      [{ id: 100, amount: 999 }],
      [],
      [],
      new Date()
    );
    expect(activeTier).toBeNull();
    expect(unitPriceById.get(100)).toBe(999);
  });
});

describe("distributeAmount", () => {
  it("加總必定等於 total", () => {
    expect(distributeAmount(1000, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1000);
    expect(distributeAmount(999, [400, 500, 300]).reduce((a, b) => a + b, 0)).toBe(999);
  });

  it("按權重比例拆分", () => {
    expect(distributeAmount(900, [400, 500])).toEqual([400, 500]);
  });

  it("除不盡時餘數補給小數部分最大的項目", () => {
    const result = distributeAmount(100, [1, 1, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect(result.sort((a, b) => b - a)).toEqual([34, 33, 33]);
  });

  it("權重全為 0 或 total <= 0 時回傳全 0", () => {
    expect(distributeAmount(1000, [0, 0])).toEqual([0, 0]);
    expect(distributeAmount(0, [1, 1])).toEqual([0, 0]);
  });

  it("空陣列回空陣列", () => {
    expect(distributeAmount(1000, [])).toEqual([]);
  });
});
