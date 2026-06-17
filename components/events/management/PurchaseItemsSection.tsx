"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PurchaseItemDraft, PriceTierDraft } from "@/hooks/use-event-form";

type PurchaseItemsSectionProps = {
  items: PurchaseItemDraft[];
  allowMultiple: boolean;
  autoCalcAmount: boolean;
  priceTiers: PriceTierDraft[];
  onAllowMultipleChange: (value: boolean) => void;
  onAutoCalcAmountChange: (value: boolean) => void;
  onAddClick: () => void;
  onRemove: (index: number) => void;
  onSetItemHidden: (index: number, hidden: boolean) => void;
  itemHiddenUpdatingIndex: number | null;
  onAddTier: () => void;
  onUpdateTier: (index: number, field: "name" | "endsAt", value: string) => void;
  onPersistTier: (index: number) => void;
  onRemoveTier: (index: number) => void;
};

export function PurchaseItemsSection({
  items,
  allowMultiple,
  autoCalcAmount,
  priceTiers,
  onAllowMultipleChange,
  onAutoCalcAmountChange,
  onAddClick,
  onRemove,
  onSetItemHidden,
  itemHiddenUpdatingIndex,
  onAddTier,
  onUpdateTier,
  onPersistTier,
  onRemoveTier,
}: PurchaseItemsSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* 票價時段：早鳥 / 一般 / 現場，依當下日期自動套用 */}
      <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <Label>票價時段（選填）</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onAddTier}
          >
            <Plus className="size-4" />
            新增時段
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          設定後可在每個購買項目填各時段價格，報名頁會依「當下日期」自動套用。
          最後一個時段截止日留空＝永不過期（作為一般／現場價）。
        </p>
        {priceTiers.length > 0 && (
          <ul className="flex flex-col gap-2">
            {priceTiers.map((tier, i) => (
              <li key={tier.id ?? `draft-${i}`} className="flex items-center gap-2">
                <Input
                  className="flex-1 bg-white"
                  placeholder="時段名稱（如 早鳥）"
                  value={tier.name}
                  onChange={(e) => onUpdateTier(i, "name", e.target.value)}
                  onBlur={() => onPersistTier(i)}
                />
                <Input
                  className="w-40 bg-white"
                  type="date"
                  value={tier.endsAt}
                  onChange={(e) => onUpdateTier(i, "endsAt", e.target.value)}
                  onBlur={() => onPersistTier(i)}
                  aria-label="截止日期"
                />
                <button
                  type="button"
                  onClick={() => onRemoveTier(i)}
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
      <div className="flex items-start justify-between">
        <Label>購買項目</Label>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => onAllowMultipleChange(e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">開放多選</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={autoCalcAmount}
              onChange={(e) => onAutoCalcAmountChange(e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">自動填寫金額</span>
          </label>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-fit gap-2"
        onClick={onAddClick}
      >
        <Plus className="size-4" />
        新增項目
      </Button>
      {items.length > 0 && (
        <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          {items.map((item, i) => (
            <li key={item.id ?? i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={item.hidden ? "text-gray-400" : "text-gray-700"}>
                {item.name} — ${item.amount}
                {item.hidden ? (
                  <span className="ml-2 text-xs text-gray-400">（報名表隱藏）</span>
                ) : null}
                {item.prices && item.prices.length > 0 ? (
                  <span className="ml-2 text-xs text-gray-400">
                    （
                    {item.prices
                      .map((p) => {
                        const tier =
                          priceTiers.find((t) => t.id != null && t.id === p.tierId) ??
                          (p.tierDraftIndex != null ? priceTiers[p.tierDraftIndex] : undefined);
                        return `${tier?.name ?? "時段"} ${p.amount}`;
                      })
                      .join(" / ")}
                    ）
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {item.id == null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetItemHidden(i, !item.hidden)}
                      className="text-gray-500 hover:underline"
                      aria-label={item.hidden ? "在報名表顯示" : "從報名表隱藏"}
                    >
                      {item.hidden ? "在報名表顯示" : "從報名表隱藏"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="text-red-500 hover:underline"
                      aria-label="移除"
                    >
                      移除
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={itemHiddenUpdatingIndex === i}
                    onClick={() => onSetItemHidden(i, !item.hidden)}
                    className="text-gray-500 hover:underline disabled:opacity-50"
                    aria-label={item.hidden ? "在報名表顯示" : "從報名表隱藏"}
                  >
                    {itemHiddenUpdatingIndex === i
                      ? "更新中…"
                      : item.hidden
                        ? "在報名表顯示"
                        : "從報名表隱藏"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
