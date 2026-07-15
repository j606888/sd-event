"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { endOfDayFromDateInput, resolveActiveTier } from "@/lib/pricing";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/** 票價時段卡：早鳥／一般／現場，依日期自動切換；標示目前生效的時段 */
export function PriceTiersCard({ form }: { form: UseEventFormReturn }) {
  const { priceTiers, addPriceTier, updatePriceTier, persistPriceTier, removePriceTier } =
    form;

  // 與伺服器同一套規則（lib/pricing.ts）算出目前生效時段，僅作顯示
  const activeIndex = (() => {
    if (priceTiers.length === 0) return -1;
    const rows = priceTiers.map((t, i) => ({
      id: i,
      name: t.name,
      endsAt: endOfDayFromDateInput(t.endsAt),
      sortOrder: i,
    }));
    const active = resolveActiveTier(rows, new Date());
    return active ? active.id : -1;
  })();

  return (
    <div className="flex flex-col gap-2 py-5 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">票價時段（選填）</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => addPriceTier()}
        >
          <Plus className="size-4" />
          新增時段
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        時段依順序生效：截止日一過就自動換下一段，報名頁的票價也會跟著換。
        最後一段的截止日留空＝不會過期（當作一般／現場價）。
      </p>
      {priceTiers.length > 0 && (
        <ul className="flex flex-col gap-2">
          {priceTiers.map((tier, i) => (
            <li key={tier.id ?? `draft-${i}`} className="flex items-center gap-2">
              <Input
                className="min-w-0 flex-1"
                placeholder="時段名稱（如 早鳥）"
                value={tier.name}
                onChange={(e) => updatePriceTier(i, "name", e.target.value)}
                onBlur={() => persistPriceTier(i)}
              />
              <Input
                className="w-36 sm:w-40"
                type="date"
                value={tier.endsAt}
                onChange={(e) => updatePriceTier(i, "endsAt", e.target.value)}
                onBlur={() => persistPriceTier(i)}
                aria-label="截止日期"
              />
              {i === activeIndex ? (
                <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                  目前適用
                </span>
              ) : (
                <span className="hidden w-[3.75rem] shrink-0 sm:inline-block" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => removePriceTier(i)}
                className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                aria-label="移除時段"
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
