"use client";

import { CalendarRange, Lock, Plus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { endOfDayFromDateInput, resolveActiveTier } from "@/lib/pricing";
import { taipeiDateInput } from "@/lib/format-event-date";
import type { PriceTierDraft, UseEventFormReturn } from "@/hooks/use-event-form";

/** "YYYY-MM-DD" + n 天，一律以台北時間計算（避免執行環境時區把日期算差一天） */
function addDays(dateInput: string, days: number): string {
  const ms = new Date(`${dateInput}T00:00:00+08:00`).getTime();
  if (Number.isNaN(ms)) return "";
  return taipeiDateInput(new Date(ms + days * 86_400_000).toISOString());
}

/** "YYYY-MM-DD" → "8/01"，時間軸上的短標示 */
function shortDate(dateInput: string): string {
  const [, m, d] = dateInput.split("-");
  return m && d ? `${Number(m)}/${d}` : dateInput;
}

/** 這個項目在此時段有沒有列價（tier 已存檔看 tierId，草稿看 tierDraftIndex） */
function hasPriceForTier(
  prices: { tierId?: number; tierDraftIndex?: number }[] | undefined,
  tier: PriceTierDraft,
  tierIndex: number
): boolean {
  return (prices ?? []).some((p) =>
    tier.id != null ? p.tierId === tier.id : p.tierDraftIndex === tierIndex
  );
}

/**
 * 票價時段卡：早鳥／一般／現場依日期自動接力，最後一段永遠生效。
 *
 * 時段是依 sortOrder 取第一個尚未截止的段（`lib/pricing.ts` 的 `resolveActiveTier`），
 * 所以**最後一段必須是唯一沒有截止日的**。舊版把它畫成一個空白的日期框，跟「忘記填」
 * 長得一模一樣；這裡改成鎖定的「到活動結束」，並在每段下方標出實際生效區間。
 */
export function PriceTiersCard({ form }: { form: UseEventFormReturn }) {
  const {
    priceTiers,
    purchaseItems,
    addPriceTier,
    seedDefaultPriceTiers,
    updatePriceTier,
    persistPriceTier,
    removePriceTier,
    openPurchaseItemEditor,
  } = form;

  const lastIndex = priceTiers.length - 1;

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

  /** 每段的生效區間文字（起始日由前一段截止日推導） */
  const rangeLabel = (index: number): string => {
    const prevEndsAt = index > 0 ? priceTiers[index - 1]?.endsAt : "";
    const start = index === 0 ? "即日起" : prevEndsAt ? shortDate(addDays(prevEndsAt, 1)) : "—";
    const tier = priceTiers[index];
    const end =
      index === lastIndex && !tier?.endsAt
        ? "活動結束"
        : tier?.endsAt
          ? shortDate(tier.endsAt)
          : "—";
    return `${start} ～ ${end}`;
  };

  /** 缺日期、或日期沒有遞增 —— 只提示不擋，這頁是即時自動儲存 */
  const warningFor = (index: number): string | null => {
    const tier = priceTiers[index];
    if (!tier) return null;
    if (index < lastIndex && !tier.endsAt) {
      return "缺截止日，這一段會一直生效、後面的時段永遠輪不到";
    }
    const prevEndsAt = index > 0 ? priceTiers[index - 1]?.endsAt : "";
    if (tier.endsAt && prevEndsAt && tier.endsAt <= prevEndsAt) {
      return `截止日要晚於「${priceTiers[index - 1]?.name || "上一段"}」`;
    }
    return null;
  };

  /** 這一段還沒有價格的票券（會默默用基準價計費） */
  const itemsMissingPrice = (tier: PriceTierDraft, tierIndex: number) =>
    purchaseItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !hasPriceForTier(item.prices, tier, tierIndex));

  return (
    <div className="flex flex-col gap-2 py-5 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">票價時段</h3>
        {priceTiers.length > 0 && (
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
        )}
      </div>

      {priceTiers.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <CalendarRange className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <p className="text-xs text-gray-500">
              目前是單一票價（不分時段）。要做早鳥優惠的話，設好時段後每張票就能各填一組價格，
              時間到自動換價。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => seedDefaultPriceTiers()}
          >
            設定早鳥／現場價
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            一段接著一段跑，時間到自動換價。最後一段沒有截止日，會一直適用到活動結束。
          </p>

          <ul className="flex flex-col gap-1.5">
            {priceTiers.map((tier, i) => {
              const isLast = i === lastIndex;
              // 舊活動的最後一段可能仍帶著截止日；照原樣顯示，另外給一個修正入口
              const isLockedFallback = isLast && !tier.endsAt;
              const warning = warningFor(i);
              const missing = itemsMissingPrice(tier, i);

              return (
                <li key={tier.id ?? `draft-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${
                        isLockedFallback
                          ? "border-2 border-brand bg-transparent"
                          : "bg-brand"
                      }`}
                    />
                    <Input
                      className="min-w-0 flex-1"
                      placeholder="時段名稱（如 早鳥）"
                      value={tier.name}
                      onChange={(e) => updatePriceTier(i, "name", e.target.value)}
                      onBlur={() => persistPriceTier(i)}
                      aria-label={`第 ${i + 1} 段名稱`}
                    />
                    {isLockedFallback ? (
                      <span className="flex h-9 w-36 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 text-xs text-gray-500 sm:w-40">
                        <Lock className="size-3.5 shrink-0" />
                        到活動結束
                      </span>
                    ) : (
                      <Input
                        className="w-36 shrink-0 sm:w-40"
                        type="date"
                        value={tier.endsAt}
                        onChange={(e) => updatePriceTier(i, "endsAt", e.target.value)}
                        onBlur={() => persistPriceTier(i)}
                        aria-label={`${tier.name || `第 ${i + 1} 段`}的截止日期`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removePriceTier(i)}
                      className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                      aria-label={`移除時段 ${tier.name || i + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4">
                    <span className="text-xs text-gray-400">{rangeLabel(i)}</span>
                    {i === activeIndex && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        目前適用
                      </span>
                    )}
                    {isLast && tier.endsAt && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePriceTier(i, "endsAt", "");
                          persistPriceTier(i);
                        }}
                        className="rounded text-xs font-medium text-brand underline-offset-2 hover:underline"
                      >
                        改為到活動結束
                      </button>
                    )}
                    {warning && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        {warning}
                      </span>
                    )}
                  </div>

                  {missing.length > 0 && (
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-4 text-xs text-amber-700">
                      <TriangleAlert className="size-3.5 shrink-0" />
                      <span>
                        {missing.length} 張票還沒有「{tier.name || `第 ${i + 1} 段`}
                        」的價格，會用基準價計費：
                      </span>
                      {missing.map(({ item, index }) => (
                        <button
                          key={item.id ?? `draft-${index}`}
                          type="button"
                          onClick={() => openPurchaseItemEditor(index)}
                          className="rounded font-medium underline underline-offset-2 hover:text-amber-900"
                        >
                          {item.name || "（未命名）"}
                        </button>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
