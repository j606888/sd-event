"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SegmentedToggle } from "@/components/ui/segmented";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SECONDS, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

// 語言名稱一律用該語言自己的寫法，不跟著介面語言翻
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh-TW", label: "中文" },
  { value: "en", label: "English" },
];

/**
 * 切換介面語言。寫 cookie 後讓 server component 重新 render，畫面不用等 API。
 *
 * `persist`（後台用）會再把語言存到帳號上，寄給這個人的通知信才會用同一種語言。
 * 這個請求失敗不影響切換：沒登入會 401，模擬檢視時 proxy 會擋掉非 GET 請求。
 */
export function LanguageSwitcher({
  className,
  persist = false,
}: {
  className?: string;
  persist?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("language");
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    startTransition(() => router.refresh());
    if (persist) {
      fetch("/api/user/locale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
    }
  };

  return (
    <SegmentedToggle
      value={locale}
      onChange={switchTo}
      options={OPTIONS}
      disabled={isPending}
      aria-label={t("label")}
      className={cn("notranslate", className)}
    />
  );
}
