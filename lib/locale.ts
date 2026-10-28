/**
 * 介面語系。網址不帶語系（已經發出去的 /e/xxx 連結要能繼續用），
 * 改由 cookie 記住使用者的選擇；沒選過就跟著瀏覽器語言。
 */
export const LOCALES = ["zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-TW";

/** 使用者手動切換語言時寫入，前後台共用 */
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly string[]).includes(value as string);
}

/**
 * 依 Accept-Language 挑語系：照偏好順序，先遇到中文就用繁中、先遇到英文就用英文。
 * 兩種都沒有（例如只設日文、韓文）就用英文，對外國舞者來說比中文好懂。
 * 沒有 header（爬蟲、curl）才用預設的繁中。
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const preferences = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q, index };
    })
    .filter((p) => p.tag && p.tag !== "*" && Number.isFinite(p.q) && p.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  if (preferences.length === 0) return DEFAULT_LOCALE;

  for (const { tag } of preferences) {
    if (tag === "zh" || tag.startsWith("zh-")) return "zh-TW";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

/** 手動選過的語系優先，否則跟著瀏覽器 */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage(acceptLanguage);
}
