"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PurchaseItemDraft = {
  id?: number;
  name: string;
  amount: number;
  /** 不在公開報名表顯示（已儲存項目由後端同步；新建項目僅存於表單狀態） */
  hidden?: boolean;
};

type PurchaseItemsSectionProps = {
  items: PurchaseItemDraft[];
  allowMultiple: boolean;
  autoCalcAmount: boolean;
  onAllowMultipleChange: (value: boolean) => void;
  onAutoCalcAmountChange: (value: boolean) => void;
  onAddClick: () => void;
  onRemove: (index: number) => void;
  onSetItemHidden: (index: number, hidden: boolean) => void;
  itemHiddenUpdatingIndex: number | null;
};

export function PurchaseItemsSection({
  items,
  allowMultiple,
  autoCalcAmount,
  onAllowMultipleChange,
  onAutoCalcAmountChange,
  onAddClick,
  onRemove,
  onSetItemHidden,
  itemHiddenUpdatingIndex,
}: PurchaseItemsSectionProps) {
  return (
    <div className="flex flex-col gap-2">
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
