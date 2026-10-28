import { describe, expect, it } from "vitest";
import zhTW from "@/messages/zh-TW.json";
import en from "@/messages/en.json";

type Messages = { [key: string]: string | Messages };

/** 攤平成 "sidebar.createTeam.title" → 字串 */
function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** ICU 參數名（{name}、{count, plural, …}）與 rich text 標籤（<muted>） */
function placeholders(message: string): string[] {
  const args = [...message.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => `{${m[1]}}`);
  const tags = [...message.matchAll(/<(\w+)>/g)].map((m) => `<${m[1]}>`);
  return [...new Set([...args, ...tags])].sort();
}

const zhMessages = flatten(zhTW);
const enMessages = flatten(en);

describe("messages", () => {
  it("has the same keys in every locale", () => {
    expect([...enMessages.keys()].sort()).toEqual([...zhMessages.keys()].sort());
  });

  it("uses the same placeholders and tags in every locale", () => {
    for (const [key, zh] of zhMessages) {
      const translated = enMessages.get(key);
      if (translated === undefined) continue;
      expect(placeholders(translated), key).toEqual(placeholders(zh));
    }
  });

  it("has no empty translations", () => {
    for (const [key, value] of [...zhMessages, ...enMessages]) {
      expect(value.trim(), key).not.toBe("");
    }
  });
});
