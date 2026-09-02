import { describe, expect, it } from "vitest";
import {
  checkInSummary,
  paymentSummary,
  roleDistribution,
  type PaymentAmountTotals,
  type PaymentCounts,
} from "./event-stats-summary";

describe("roleDistribution", () => {
  it("以報名總人數為分母，尚未確定也算在內", () => {
    const { total, rows } = roleDistribution({
      Leader: 11,
      Follower: 12,
      "Not sure": 1,
    });

    expect(total).toBe(24);
    expect(rows.map((r) => [r.key, r.count, r.pct])).toEqual([
      ["Leader", 11, 46],
      ["Follower", 12, 50],
      ["Not sure", 1, 4],
    ]);
  });

  it("沒有任何報名時百分比一律 0，不會出現 NaN", () => {
    const { total, rows } = roleDistribution({
      Leader: 0,
      Follower: 0,
      "Not sure": 0,
    });

    expect(total).toBe(0);
    for (const row of rows) {
      expect(row.pct).toBe(0);
      expect(Number.isFinite(row.pct)).toBe(true);
    }
  });

  it("只有單一角色時該角色佔滿，其餘為 0（bar 不會留下空隙）", () => {
    const { rows } = roleDistribution({ Leader: 5, Follower: 0, "Not sure": 0 });

    expect(rows.find((r) => r.key === "Leader")?.pct).toBe(100);
    expect(rows.filter((r) => r.key !== "Leader").every((r) => r.pct === 0)).toBe(
      true
    );
  });

  it("三個角色都固定回傳，順序為 Leader → Follower → 尚未確定", () => {
    const { rows } = roleDistribution({ Leader: 0, Follower: 3, "Not sure": 0 });
    expect(rows.map((r) => r.key)).toEqual(["Leader", "Follower", "Not sure"]);
  });
});

describe("checkInSummary", () => {
  it("已入場與未入場相加等於報名人數", () => {
    const s = checkInSummary(24, 18);
    expect(s).toEqual({ entered: 18, notEntered: 6, pct: 75 });
  });

  it("零報名不會除以 0", () => {
    expect(checkInSummary(0, 0)).toEqual({ entered: 0, notEntered: 0, pct: 0 });
  });

  it("入場數異常大於報名數時夾住，未入場不會變負數", () => {
    expect(checkInSummary(3, 5)).toEqual({ entered: 3, notEntered: 0, pct: 100 });
  });
});

describe("paymentSummary", () => {
  const amounts: PaymentAmountTotals = {
    confirmed: 32400,
    reported: 4800,
    pending: 3600,
  };
  const counts: PaymentCounts = { confirmed: 18, reported: 3, pending: 3 };

  it("全部付款可收為三態相加，收款進度為已確認佔比", () => {
    const s = paymentSummary(amounts, counts);

    expect(s.expectedTotal).toBe(40800);
    expect(s.collected).toBe(32400);
    expect(s.outstanding).toBe(8400);
    expect(s.totalCount).toBe(24);
    expect(s.collectedPct).toBe(79);
  });

  it("明細三列帶著金額、筆數與堆疊 bar 的寬度", () => {
    const s = paymentSummary(amounts, counts);

    expect(s.rows.map((r) => [r.key, r.amount, r.count])).toEqual([
      ["confirmed", 32400, 18],
      ["reported", 4800, 3],
      ["pending", 3600, 3],
    ]);
    expect(s.rows.map((r) => r.pct)).toEqual([79, 12, 9]);
  });

  it("全部款項為 0 時進度與各段寬度都是 0", () => {
    const s = paymentSummary(
      { confirmed: 0, reported: 0, pending: 0 },
      { confirmed: 0, reported: 0, pending: 0 }
    );

    expect(s.expectedTotal).toBe(0);
    expect(s.collectedPct).toBe(0);
    expect(s.rows.every((r) => r.pct === 0)).toBe(true);
  });

  it("全部收齊時進度 100%，未入帳為 0", () => {
    const s = paymentSummary(
      { confirmed: 12000, reported: 0, pending: 0 },
      { confirmed: 8, reported: 0, pending: 0 }
    );

    expect(s.collectedPct).toBe(100);
    expect(s.outstanding).toBe(0);
  });

  it("一毛都還沒收時進度 0%，但天花板仍反映應收金額", () => {
    const s = paymentSummary(
      { confirmed: 0, reported: 0, pending: 9000 },
      { confirmed: 0, reported: 0, pending: 6 }
    );

    expect(s.collectedPct).toBe(0);
    expect(s.expectedTotal).toBe(9000);
    expect(s.rows.find((r) => r.key === "pending")?.pct).toBe(100);
  });
});
