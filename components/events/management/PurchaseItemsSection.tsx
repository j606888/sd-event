"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PurchaseItemDraft = { id?: number; name: string; amount: number };

type PurchaseItemsSectionProps = {
  items: PurchaseItemDraft[];
  allowMultiple: boolean;
  autoCalcAmount: boolean;
  onAllowMultipleChange: (value: boolean) => void;
  onAutoCalcAmountChange: (value: boolean) => void;
  onAddClick: () => void;
  onRemove: (index: number) => void;
};

export function PurchaseItemsSection({
  items,
  allowMultiple,
  autoCalcAmount,
  onAllowMultipleChange,
  onAutoCalcAmountChange,
  onAddClick,
  onRemove,
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
            <li key={item.id ?? i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-700">{item.name} — ${item.amount}</span>
              {item.id == null && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-red-500 hover:underline"
                  aria-label="移除"
                >
                  移除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
