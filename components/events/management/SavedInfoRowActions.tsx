"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 列表列尾的「用在幾個活動」，讓刪之前就看得到影響範圍；手機上收起來省空間 */
export function SavedInfoUsageBadge({ count }: { count: number }) {
  const t = useTranslations("savedInfo.usage");
  return count > 0 ? (
    <span className="hidden shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong sm:inline-flex">
      {t("count", { count })}
    </span>
  ) : (
    <span className="hidden shrink-0 rounded-full bg-field px-2.5 py-0.5 text-xs font-medium text-muted-ink sm:inline-flex">
      {t("none")}
    </span>
  );
}

/**
 * 常用資訊列表每一列的 ⋯ 選單（編輯／刪除）。
 * 整列本身點了是編輯，所以選單的點擊都要擋住冒泡 —— Radix 的 Portal 在 React 樹上
 * 仍是這一列的子孫，事件照樣會冒到 li 的 onClick。
 */
export function SavedInfoRowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("savedInfo.rowMenu");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="-my-2 flex size-10 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-600"
        aria-label={t("moreAria", { name })}
      >
        <Ellipsis className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          <span>{t("edit")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          <span>{t("delete")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
