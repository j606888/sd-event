import { describe, expect, it } from "vitest";
import { shouldRefreshSession } from "./session-refresh";

const DAY = 60 * 60 * 24;
const MAX_AGE = 30 * DAY;
const NOW = 1_760_000_000;

describe("shouldRefreshSession", () => {
  it("剛發的 token 不續期", () => {
    expect(shouldRefreshSession(NOW + MAX_AGE, NOW, MAX_AGE)).toBe(false);
  });

  it("剩餘壽命還過半就不續期", () => {
    expect(shouldRefreshSession(NOW + 16 * DAY, NOW, MAX_AGE)).toBe(false);
  });

  it("剛好剩一半不續期（邊界）", () => {
    expect(shouldRefreshSession(NOW + 15 * DAY, NOW, MAX_AGE)).toBe(false);
  });

  it("剩餘壽命不到一半就續期", () => {
    expect(shouldRefreshSession(NOW + 15 * DAY - 1, NOW, MAX_AGE)).toBe(true);
  });

  it("快過期的續期", () => {
    expect(shouldRefreshSession(NOW + 60, NOW, MAX_AGE)).toBe(true);
  });

  it("剛好過期不續期", () => {
    expect(shouldRefreshSession(NOW, NOW, MAX_AGE)).toBe(false);
  });

  it("已經過期不續期（交給 proxy 清 cookie）", () => {
    expect(shouldRefreshSession(NOW - DAY, NOW, MAX_AGE)).toBe(false);
  });

  it("模擬檢視那種短 TTL 也適用同一條規則", () => {
    const halfHour = 60 * 30;
    expect(shouldRefreshSession(NOW + 20 * 60, NOW, halfHour)).toBe(false);
    expect(shouldRefreshSession(NOW + 10 * 60, NOW, halfHour)).toBe(true);
  });
});
