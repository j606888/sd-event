import type messages from "../messages/zh-TW";
import type { Locale } from "@/lib/locale";

// 讓 t("...") 的 key 有型別檢查：以繁中訊息檔為準，英文的 key 由 lib/messages.test.ts 對齊
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
