import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/locale";

const MESSAGES: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  "zh-TW": () => import("@/messages/zh-TW"),
  en: () => import("@/messages/en"),
};

/**
 * next-intl 每個 request 的設定（沒有用 i18n routing，網址不帶語系）。
 * 時區固定台北，跟 lib/format-event-date.ts 的原則一致：伺服器在 Vercel 上是 UTC。
 */
export default getRequestConfig(async () => {
  const locale = resolveLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get("accept-language")
  );

  return {
    locale,
    messages: (await MESSAGES[locale]()).default,
    timeZone: "Asia/Taipei",
  };
});
