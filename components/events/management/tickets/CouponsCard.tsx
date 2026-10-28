"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/** 折扣碼卡：折固定金額（整筆折一次）或打折（%），可設使用次數上限 */
export function CouponsCard({ form }: { form: UseEventFormReturn }) {
  const {
    coupons,
    addCoupon,
    updateCoupon,
    persistCoupon,
    removeCoupon,
    groups,
    autoCalcAmount,
  } = form;
  const t = useTranslations("tickets.coupons");

  // 折扣碼僅在伺服器能權威計算金額的活動生效（與後端 registrations route 的規則一致）
  const couponsSupported = groups.length > 0 || autoCalcAmount;

  return (
    <div className="flex flex-col gap-2 py-5 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">{t("title")}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => addCoupon()}
          disabled={!couponsSupported}
        >
          <Plus className="size-4" />
          <span>{t("add")}</span>
        </Button>
      </div>
      {couponsSupported ? (
        <p className="text-xs text-gray-500">
          {t("description")}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          {t("unsupported")}
        </p>
      )}
      {couponsSupported && coupons.length > 0 && (
        <ul className="flex flex-col gap-3 sm:gap-2">
          {/* 手機：每張折扣碼三行（代碼＋刪除／類型＋數值／使用上限）；sm 起 sm:contents 攤平回單行 */}
          {coupons.map((coupon, i) => (
            <li
              key={coupon.id ?? `draft-${i}`}
              className="flex flex-col gap-2 border-b border-hairline pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-center sm:border-b-0 sm:pb-0"
            >
              <div className="flex items-center gap-2 sm:contents">
                <Input
                  className="min-w-0 flex-1 font-mono uppercase sm:w-36 sm:flex-none"
                  placeholder={t("codePlaceholder")}
                  value={coupon.code}
                  onChange={(e) =>
                    updateCoupon(i, "code", e.target.value.toUpperCase())
                  }
                  onBlur={() => persistCoupon(i)}
                />
                <button
                  type="button"
                  onClick={() => removeCoupon(i)}
                  className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500 sm:order-last"
                  aria-label={t("removeAria")}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:contents">
                <select
                  className="h-9 rounded-md border-0 bg-field px-2 text-sm shadow-xs"
                  value={coupon.discountType}
                  onChange={(e) => {
                    const next = e.target.value === "percent" ? "percent" : "fixed";
                    updateCoupon(i, "discountType", next);
                    persistCoupon(i, { discountType: next });
                  }}
                  aria-label={t("typeAria")}
                >
                  <option value="fixed">{t("typeFixed")}</option>
                  <option value="percent">{t("typePercent")}</option>
                </select>
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  max={coupon.discountType === "percent" ? 100 : undefined}
                  placeholder={coupon.discountType === "percent" ? t("percentPlaceholder") : t("amountPlaceholder")}
                  value={coupon.value}
                  onChange={(e) => updateCoupon(i, "value", e.target.value)}
                  onBlur={() => persistCoupon(i)}
                  aria-label={t("valueAria")}
                />
                {coupon.discountType === "percent" &&
                  Number(coupon.value) > 0 &&
                  Number(coupon.value) < 100 && (
                    <span className="text-xs text-gray-500">
                      {/* rate＝打幾折（8 ＝付 80%）；英文訊息用 ::scale/10 換成百分比 */}
                      {t("equivalent", { rate: (100 - Number(coupon.value)) / 10 })}
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-2 sm:contents">
                <span className="text-xs text-gray-500 sm:hidden">{t("usageLimit")}</span>
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  placeholder={t("unlimited")}
                  value={coupon.usageLimit}
                  onChange={(e) => updateCoupon(i, "usageLimit", e.target.value)}
                  onBlur={() => persistCoupon(i)}
                  aria-label={t("usageLimit")}
                />
                {coupon.usageLimit ? (
                  <span className="text-xs text-gray-400">
                    {t("usedOfLimit", { used: coupon.usedCount ?? 0, limit: coupon.usageLimit })}
                  </span>
                ) : (
                  (coupon.usedCount ?? 0) > 0 && (
                    <span className="text-xs text-gray-400">
                      {t("usedCount", { count: coupon.usedCount ?? 0 })}
                    </span>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
