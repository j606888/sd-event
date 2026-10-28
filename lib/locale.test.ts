import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage, resolveLocale } from "./locale";

describe("localeFromAcceptLanguage", () => {
  it("falls back to zh-TW when there is no usable header", () => {
    expect(localeFromAcceptLanguage(null)).toBe("zh-TW");
    expect(localeFromAcceptLanguage("")).toBe("zh-TW");
    expect(localeFromAcceptLanguage("*")).toBe("zh-TW");
  });

  it("maps any Chinese variant to zh-TW", () => {
    expect(localeFromAcceptLanguage("zh-TW,zh;q=0.9,en-US;q=0.8")).toBe("zh-TW");
    expect(localeFromAcceptLanguage("zh-CN")).toBe("zh-TW");
    expect(localeFromAcceptLanguage("zh-Hant-HK")).toBe("zh-TW");
  });

  it("uses English when English is preferred over Chinese", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,zh-TW;q=0.8")).toBe("en");
  });

  it("honours q-values rather than header order", () => {
    expect(localeFromAcceptLanguage("en;q=0.5,zh-TW;q=0.9")).toBe("zh-TW");
  });

  it("skips other languages to find the first Chinese or English one", () => {
    expect(localeFromAcceptLanguage("ja-JP,ja;q=0.9,zh-TW;q=0.8,en;q=0.7")).toBe("zh-TW");
    expect(localeFromAcceptLanguage("ko-KR,en;q=0.5")).toBe("en");
  });

  it("uses English for visitors who prefer neither Chinese nor English", () => {
    expect(localeFromAcceptLanguage("ja-JP")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR,de;q=0.8")).toBe("en");
  });

  it("ignores languages explicitly rejected with q=0", () => {
    expect(localeFromAcceptLanguage("zh-TW;q=0,en")).toBe("en");
  });

  it("does not treat look-alike tags as Chinese or English", () => {
    expect(localeFromAcceptLanguage("zha,eno")).toBe("en");
  });
});

describe("resolveLocale", () => {
  it("prefers a valid cookie over the browser language", () => {
    expect(resolveLocale("en", "zh-TW")).toBe("en");
    expect(resolveLocale("zh-TW", "en-US")).toBe("zh-TW");
  });

  it("ignores an unknown cookie value", () => {
    expect(resolveLocale("fr", "en-US")).toBe("en");
    expect(resolveLocale(undefined, "zh-TW")).toBe("zh-TW");
  });
});
