import { describe, expect, it } from "vitest";
import { lineAddFriendUrl, lineIdForDisplay, lineIdInputError } from "./line";

describe("lineAddFriendUrl", () => {
  it("個人 ID 加上 ~", () => {
    expect(lineAddFriendUrl("xiaoming")).toBe("https://line.me/ti/p/~xiaoming");
    expect(lineAddFriendUrl("  xiao.ming_01 ")).toBe("https://line.me/ti/p/~xiao.ming_01");
  });
  it("官方帳號 @ 開頭", () => {
    expect(lineAddFriendUrl("@abc123")).toBe("https://line.me/R/ti/p/%40abc123");
  });
  it("完整連結原樣使用", () => {
    expect(lineAddFriendUrl("https://line.me/ti/p/AbCdEf123")).toBe("https://line.me/ti/p/AbCdEf123");
  });
  it("空值回 null", () => {
    expect(lineAddFriendUrl("")).toBeNull();
    expect(lineAddFriendUrl(null)).toBeNull();
  });
});

describe("lineIdForDisplay", () => {
  it("ID 顯示、連結不顯示", () => {
    expect(lineIdForDisplay("xiaoming")).toBe("xiaoming");
    expect(lineIdForDisplay("https://line.me/ti/p/abc")).toBeNull();
  });
});

describe("lineIdInputError", () => {
  it("接受 ID、官方帳號與 LINE 連結", () => {
    expect(lineIdInputError("xiaoming")).toBeNull();
    expect(lineIdInputError("@abc123")).toBeNull();
    expect(lineIdInputError("https://line.me/ti/p/abc")).toBeNull();
    expect(lineIdInputError("https://lin.ee/abc")).toBeNull();
  });
  it("拒絕空值、空白與非 LINE 網址", () => {
    expect(lineIdInputError(" ")).toBe("empty");
    expect(lineIdInputError("xiao ming")).toBe("hasWhitespace");
    expect(lineIdInputError("https://evil.example.com/line.me")).toBe("notLineHost");
    expect(lineIdInputError("https://line.me:abc")).toBe("invalidUrl");
  });
});
