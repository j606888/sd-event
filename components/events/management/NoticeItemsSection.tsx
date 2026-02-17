"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type NoticeItemDraft = { id?: number; content: string };

type NoticeItemsSectionProps = {
  items: NoticeItemDraft[];
  onAddClick: () => void;
  onRemove: (index: number) => void;
};

export function NoticeItemsSection({
  items,
  onAddClick,
  onRemove,
}: NoticeItemsSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>須知項目(選填)</Label>
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
              <span className="text-gray-700 truncate">{item.content || "(空白)"}</span>
              {item.id == null && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="shrink-0 text-red-500 hover:underline"
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
