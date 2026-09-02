import { describe, expect, it } from "vitest";
import {
  endOfDayFromDateInput,
  getItemUnitPrice,
  resolveActiveTier,
  type PriceTier,
} from "./pricing";

/** 測試用時段；endsAt 以「該日台北時間 23:59:59.999」為準，和正式路徑同一個轉換函式 */
const tier = (
  id: number,
  name: string,
  endsAt: string | null,
  sortOrder = id
): PriceTier => ({
  id,
  name,
  endsAt: endOfDayFromDateInput(endsAt),
  sortOrder,
});

/** 台北時間某日某時的 Date（測試不受執行環境時區影響） */
const taipei = (iso: string) => new Date(`${iso}+08:00`);

describe("resolveActiveTier", () => {
  it("取第一個尚未截止的時段", () => {
    const tiers = [
      tier(1, "早鳥", "2026-08-01"),
      tier(2, "一般", "2026-09-30"),
      tier(3, "現場", null),
    ];
    expect(resolveActiveTier(tiers, taipei("2026-07-15T10:00"))?.name).toBe("早鳥");
    expect(resolveActiveTier(tiers, taipei("2026-09-02T10:00"))?.name).toBe("一般");
    expect(resolveActiveTier(tiers, taipei("2026-10-05T10:00"))?.name).toBe("現場");
  });

  it("截止日當天仍算在該時段內（含當日 23:59:59.999）", () => {
    const tiers = [tier(1, "早鳥", "2026-08-01"), tier(2, "現場", null)];
    expect(resolveActiveTier(tiers, taipei("2026-08-01T23:59"))?.name).toBe("早鳥");
    expect(resolveActiveTier(tiers, taipei("2026-08-02T00:00"))?.name).toBe("現場");
  });

  it("不依陣列順序、而依 sortOrder 升冪解析", () => {
    const tiers = [
      tier(3, "現場", null, 2),
      tier(1, "早鳥", "2026-08-01", 0),
      tier(2, "一般", "2026-09-30", 1),
    ];
    expect(resolveActiveTier(tiers, taipei("2026-07-15T10:00"))?.name).toBe("早鳥");
  });

  it("全部已截止時退回最後一段", () => {
    const tiers = [tier(1, "早鳥", "2026-08-01"), tier(2, "一般", "2026-08-20")];
    expect(resolveActiveTier(tiers, taipei("2026-09-02T10:00"))?.name).toBe("一般");
  });

  it("沒有任何時段時回 null", () => {
    expect(resolveActiveTier([], new Date())).toBeNull();
  });

  // ↓ 這兩個情境正是票券設定介面要防掉的無效狀態，先把現行行為釘住

  it("fallback 段之後的時段永遠不會生效（新增時段 append 到最後的後果）", () => {
    const tiers = [
      tier(1, "早鳥", "2026-08-01", 0),
      tier(2, "現場", null, 1),
      tier(3, "後來加的一般", "2026-09-30", 2),
    ];
    // 早鳥已過期 → 遇到 endsAt 為 null 的「現場」就停住，第三段拿不到
    expect(resolveActiveTier(tiers, taipei("2026-09-02T10:00"))?.name).toBe("現場");
  });

  it("所有時段都沒有截止日時永遠停在第一段（範本的預設狀態）", () => {
    const tiers = [
      tier(1, "超早鳥", null, 0),
      tier(2, "早鳥", null, 1),
      tier(3, "一般 / 現場", null, 2),
    ];
    expect(resolveActiveTier(tiers, taipei("2030-01-01T10:00"))?.name).toBe("超早鳥");
  });
});

describe("getItemUnitPrice", () => {
  const prices = [
    { tierId: 1, amount: 400 },
    { tierId: 2, amount: 500 },
  ];

  it("有列價時用列價", () => {
    expect(getItemUnitPrice(999, prices, 1)).toBe(400);
    expect(getItemUnitPrice(999, prices, 2)).toBe(500);
  });

  it("該時段缺列價時退回項目的 amount", () => {
    expect(getItemUnitPrice(999, prices, 3)).toBe(999);
    expect(getItemUnitPrice(999, [], 1)).toBe(999);
  });

  it("沒有生效時段（活動未設時段）時退回項目的 amount", () => {
    expect(getItemUnitPrice(999, prices, null)).toBe(999);
  });
});

describe("endOfDayFromDateInput", () => {
  it("純日期錨定為該日台北時間 23:59:59.999", () => {
    expect(endOfDayFromDateInput("2026-08-01")?.toISOString()).toBe(
      "2026-08-01T15:59:59.999Z"
    );
  });

  it("空值代表 fallback 段（永不過期）", () => {
    expect(endOfDayFromDateInput("")).toBeNull();
    expect(endOfDayFromDateInput("   ")).toBeNull();
    expect(endOfDayFromDateInput(null)).toBeNull();
    expect(endOfDayFromDateInput(undefined)).toBeNull();
  });

  it("完整 ISO 字串照原樣解析", () => {
    expect(endOfDayFromDateInput("2026-08-01T12:00:00+08:00")?.toISOString()).toBe(
      "2026-08-01T04:00:00.000Z"
    );
  });

  it("無法解析的字串回 null", () => {
    expect(endOfDayFromDateInput("not-a-date")).toBeNull();
  });
});
