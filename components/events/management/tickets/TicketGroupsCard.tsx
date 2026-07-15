"use client";

import { Ellipsis, Eye, EyeOff, Info, LayoutList, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedToggle } from "@/components/ui/segmented";
import type {
  PurchaseItemDraft,
  PurchaseItemGroupDraft,
  UseEventFormReturn,
} from "@/hooks/use-event-form";

const groupKeyOf = (group: PurchaseItemGroupDraft, groupIndex: number) =>
  group.id != null ? `id-${group.id}` : `draft-${groupIndex}`;

const itemGroupKey = (item: PurchaseItemDraft) => {
  if (item.groupId != null) return `id-${item.groupId}`;
  if (item.groupDraftIndex != null) return `draft-${item.groupDraftIndex}`;
  return null;
};

/** 用白話描述區塊規則對報名者的實際意義 */
function groupRuleSentence(group: PurchaseItemGroupDraft): string {
  if (group.selectionMode === "single") {
    return group.required
      ? "報名者必須從這個區塊選 1 張票"
      : "報名者可以選 1 張，也可以不選";
  }
  return group.required
    ? "報名者至少要選 1 張，可以選多張"
    : "報名者可以選多張，也可以不選";
}

/**
 * 票券內容卡：票券清單＋票券區塊（一級功能）。
 * 無區塊時為平面清單；有區塊時每個區塊一張卡，各自有規則設定與「＋新增票券」。
 */
export function TicketGroupsCard({ form }: { form: UseEventFormReturn }) {
  const {
    purchaseItems,
    priceTiers,
    groups,
    openPurchaseItemAdder,
    openPurchaseItemEditor,
    deletePurchaseItem,
    purchaseItemDeletingIndex,
    setPurchaseItemHidden,
    purchaseItemHiddenUpdatingIndex,
    assignItemGroup,
    addGroup,
    updateGroup,
    persistGroup,
    removeGroup,
  } = form;

  const useGroups = groups.length > 0;
  const indexedItems = purchaseItems.map((item, index) => ({ item, index }));

  const renderItemRow = (
    item: PurchaseItemDraft,
    i: number,
    options?: { showAssignSelect?: boolean }
  ) => {
    const sold = item.soldCount ?? 0;
    const canDelete = sold === 0;
    const itemBody = (
      <>
        {item.name} — ${item.amount}
        {item.hidden ? (
          <span className="ml-2 text-xs text-gray-400">（報名表隱藏）</span>
        ) : null}
        {item.prices && item.prices.length > 0 ? (
          <span className="block text-xs text-gray-400 sm:ml-2 sm:inline">
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
      </>
    );
    return (
      <li
        key={item.id ?? `draft-${i}`}
        className="flex items-center justify-between gap-2 py-2.5 text-sm"
      >
        <button
          type="button"
          onClick={() => openPurchaseItemEditor(i)}
          className={`group -mx-1 flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-gray-100 ${
            item.hidden ? "text-gray-400" : "text-gray-700"
          }`}
          aria-label={`編輯 ${item.name}`}
        >
          <span className="min-w-0">{itemBody}</span>
          <Pencil className="size-3.5 shrink-0 text-gray-300 group-hover:text-gray-500" />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {options?.showAssignSelect && (
            <select
              className="h-8 rounded-md border-0 bg-amber-50 px-2 text-xs text-amber-800"
              value=""
              onChange={(e) => {
                if (e.target.value) assignItemGroup(i, e.target.value);
              }}
              aria-label={`把 ${item.name} 移到區塊`}
            >
              <option value="">移到區塊…</option>
              {groups.map((group, gi) => (
                <option key={group.id ?? `draft-${gi}`} value={groupKeyOf(group, gi)}>
                  {group.title || "（未命名區塊）"}
                </option>
              ))}
            </select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-600"
              aria-label={`${item.name} 更多操作`}
            >
              <Ellipsis className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openPurchaseItemEditor(i)}>
                <Pencil />
                編輯
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={purchaseItemHiddenUpdatingIndex === i}
                onSelect={() => setPurchaseItemHidden(i, !item.hidden)}
              >
                {item.hidden ? <Eye /> : <EyeOff />}
                {purchaseItemHiddenUpdatingIndex === i
                  ? "更新中…"
                  : item.hidden
                    ? "在報名表顯示"
                    : "從報名表隱藏"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!canDelete || purchaseItemDeletingIndex === i}
                onSelect={() => deletePurchaseItem(i)}
              >
                <Trash2 />
                {purchaseItemDeletingIndex === i
                  ? "刪除中…"
                  : canDelete
                    ? "刪除"
                    : "刪除（已有報名）"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  const handleRemoveGroup = (index: number) => {
    const group = groups[index];
    const ok = window.confirm(
      `刪除區塊「${group?.title || "（未命名區塊）"}」？\n其中的票券會變成「尚未指定區塊」，相關的互斥規則也會一併移除。`
    );
    if (!ok) return;
    removeGroup(index);
  };

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">票券內容</h3>
        {!useGroups && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => openPurchaseItemAdder()}
          >
            <Plus className="size-4" />
            新增票券
          </Button>
        )}
      </div>

      {!useGroups && (
        <>
          {purchaseItems.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {purchaseItems.map((item, i) => renderItemRow(item, i))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">尚未新增票券。</p>
          )}
          {/* 引導啟用票券區塊（原「群組」功能） */}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <LayoutList className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <p className="text-xs text-gray-500">
                想把票券分成多個區塊嗎？例如「主票種」必選一張、「加購項目」可自由複選。
                週末工作坊、Festival 常用這種設定。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => addGroup()}
            >
              啟用票券區塊
            </Button>
          </div>
        </>
      )}

      {useGroups && (
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => {
            const groupItems = indexedItems.filter(
              ({ item }) => itemGroupKey(item) === groupKeyOf(group, gi)
            );
            return (
              <div
                key={group.id ?? `draft-${gi}`}
                className="flex flex-col gap-2 border-l-2 border-brand/70 pl-3 sm:pl-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-full sm:w-auto sm:min-w-[8rem] sm:flex-1"
                    placeholder="區塊名稱（如 主票種）"
                    value={group.title}
                    onChange={(e) => updateGroup(gi, "title", e.target.value)}
                    onBlur={() => persistGroup(gi)}
                  />
                  <SegmentedToggle
                    aria-label="選擇方式"
                    value={group.selectionMode}
                    options={[
                      { value: "single", label: "單選" },
                      { value: "multiple", label: "可複選" },
                    ]}
                    onChange={(mode) => {
                      updateGroup(gi, "selectionMode", mode);
                      persistGroup(gi, { selectionMode: mode });
                    }}
                  />
                  <SegmentedToggle
                    aria-label="是否必選"
                    value={group.required ? "required" : "optional"}
                    options={[
                      { value: "required", label: "必選" },
                      { value: "optional", label: "可跳過" },
                    ]}
                    onChange={(v) => {
                      const required = v === "required";
                      updateGroup(gi, "required", required);
                      persistGroup(gi, { required });
                    }}
                  />
                  <Popover>
                    <PopoverTrigger
                      className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600 data-[state=open]:text-gray-600"
                      aria-label="區塊規則說明"
                    >
                      <Info className="size-4" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-64 px-3 py-2">
                      <p className="text-xs text-gray-600">{groupRuleSentence(group)}</p>
                    </PopoverContent>
                  </Popover>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(gi)}
                    className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                    aria-label="刪除區塊"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {groupItems.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-hairline">
                    {groupItems.map(({ item, index }) => renderItemRow(item, index))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">此區塊還沒有票券。</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 self-start"
                  onClick={() => openPurchaseItemAdder(groupKeyOf(group, gi))}
                >
                  <Plus className="size-4" />
                  新增票券
                </Button>
              </div>
            );
          })}

          {(() => {
            const ungrouped = indexedItems.filter(
              ({ item }) => itemGroupKey(item) === null
            );
            if (ungrouped.length === 0) return null;
            return (
              <div className="flex flex-col gap-1 border-l-2 border-amber-400 pl-3 sm:pl-4">
                <p className="text-sm font-medium text-amber-700">
                  尚未指定區塊的票券
                </p>
                <p className="text-xs text-amber-700/80">
                  這些票券不會出現在報名表上，請先把它們移到一個區塊。
                </p>
                <ul className="flex flex-col divide-y divide-hairline">
                  {ungrouped.map(({ item, index }) =>
                    renderItemRow(item, index, { showAssignSelect: true })
                  )}
                </ul>
              </div>
            );
          })()}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 self-start"
            onClick={() => addGroup()}
          >
            <Plus className="size-4" />
            新增票券區塊
          </Button>
        </div>
      )}
    </div>
  );
}
