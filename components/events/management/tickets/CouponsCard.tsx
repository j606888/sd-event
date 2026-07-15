"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // 折扣碼僅在伺服器能權威計算金額的活動生效（與後端 registrations route 的規則一致）
  const couponsSupported = groups.length > 0 || autoCalcAmount;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <Label>折扣碼（選填）</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => addCoupon()}
          disabled={!couponsSupported}
        >
          <Plus className="size-4" />
          新增折扣碼
        </Button>
      </div>
      {couponsSupported ? (
        <p className="text-xs text-gray-500">
          報名者輸入折扣碼後自動調整金額。固定金額為整筆報名折一次；打折輸入折扣百分比（例：20 ＝ 少收
          20%，即打 8 折）。使用上限留空＝不限次數。
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          折扣碼僅支援自動計算金額的活動（使用票券區塊，或關閉「報名者自行填寫金額」）。
        </p>
      )}
      {couponsSupported && coupons.length > 0 && (
        <ul className="flex flex-col gap-2">
          {coupons.map((coupon, i) => (
            <li
              key={coupon.id ?? `draft-${i}`}
              className="flex flex-wrap items-center gap-2"
            >
              <Input
                className="w-36 bg-white font-mono uppercase"
                placeholder="折扣碼"
                value={coupon.code}
                onChange={(e) =>
                  updateCoupon(i, "code", e.target.value.toUpperCase())
                }
                onBlur={() => persistCoupon(i)}
              />
              <select
                className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={coupon.discountType}
                onChange={(e) => {
                  const next = e.target.value === "percent" ? "percent" : "fixed";
                  updateCoupon(i, "discountType", next);
                  persistCoupon(i, { discountType: next });
                }}
                aria-label="折扣類型"
              >
                <option value="fixed">折抵金額</option>
                <option value="percent">打折（%）</option>
              </select>
              <Input
                className="w-24 bg-white"
                type="number"
                min={1}
                max={coupon.discountType === "percent" ? 100 : undefined}
                placeholder={coupon.discountType === "percent" ? "折扣 %" : "金額"}
                value={coupon.value}
                onChange={(e) => updateCoupon(i, "value", e.target.value)}
                onBlur={() => persistCoupon(i)}
                aria-label="折扣數值"
              />
              <Input
                className="w-24 bg-white"
                type="number"
                min={1}
                placeholder="不限"
                value={coupon.usageLimit}
                onChange={(e) => updateCoupon(i, "usageLimit", e.target.value)}
                onBlur={() => persistCoupon(i)}
                aria-label="使用上限"
              />
              {coupon.discountType === "percent" &&
                Number(coupon.value) > 0 &&
                Number(coupon.value) < 100 && (
                  <span className="text-xs text-gray-500">
                    ＝打 {(100 - Number(coupon.value)) / 10} 折
                  </span>
                )}
              {coupon.usageLimit ? (
                <span className="text-xs text-gray-400">
                  已用 {coupon.usedCount ?? 0}/{coupon.usageLimit}
                </span>
              ) : (
                (coupon.usedCount ?? 0) > 0 && (
                  <span className="text-xs text-gray-400">
                    已用 {coupon.usedCount} 次
                  </span>
                )
              )}
              <button
                type="button"
                onClick={() => removeCoupon(i)}
                className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                aria-label="移除折扣碼"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
