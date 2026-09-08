import { describe, expect, it } from "vitest";
import { loginPath, safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("接受站內路徑", () => {
    expect(safeNextPath("/events")).toBe("/events");
    expect(safeNextPath("/events/12")).toBe("/events/12");
    expect(safeNextPath("/events/12/scan")).toBe("/events/12/scan");
  });

  it("保留 query 與 hash", () => {
    expect(safeNextPath("/events?status=open")).toBe("/events?status=open");
    expect(safeNextPath("/events/12#registrations")).toBe("/events/12#registrations");
  });

  it("擋掉絕對網址（open redirect）", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("http://evil.example/events")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("data:text/html,hi")).toBeNull();
  });

  it("擋掉 protocol-relative 網址", () => {
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("//evil.example/events")).toBeNull();
  });

  it("擋掉反斜線寫法（部分瀏覽器等同斜線）", () => {
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("/\\/evil.example")).toBeNull();
    expect(safeNextPath("\\\\evil.example")).toBeNull();
  });

  it("擋掉相對路徑", () => {
    expect(safeNextPath("events")).toBeNull();
    expect(safeNextPath("../admin")).toBeNull();
  });

  it("擋掉控制字元", () => {
    expect(safeNextPath("/events\nLocation: https://evil.example")).toBeNull();
    expect(safeNextPath("/events\r\n")).toBeNull();
  });

  it("擋掉導回去沒意義的路徑", () => {
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/login?expired=1")).toBeNull();
    expect(safeNextPath("/register")).toBeNull();
    expect(safeNextPath("/api/teams")).toBeNull();
  });

  it("空值回 null", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("不會把開頭剛好像關鍵字的路徑誤擋", () => {
    expect(safeNextPath("/logins")).toBe("/logins");
    expect(safeNextPath("/apiary")).toBe("/apiary");
  });
});

describe("loginPath", () => {
  it("沒有 next 也沒過期就是乾淨的 /login", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath(null)).toBe("/login");
  });

  it("帶上 next", () => {
    expect(loginPath("/events/12")).toBe("/login?next=%2Fevents%2F12");
  });

  it("帶上過期提示", () => {
    expect(loginPath(null, { expired: true })).toBe("/login?expired=1");
  });

  it("兩者都有", () => {
    expect(loginPath("/events", { expired: true })).toBe(
      "/login?expired=1&next=%2Fevents"
    );
  });

  it("不安全的 next 直接丟掉，不影響其餘參數", () => {
    expect(loginPath("https://evil.example", { expired: true })).toBe(
      "/login?expired=1"
    );
    expect(loginPath("//evil.example")).toBe("/login");
  });
});
