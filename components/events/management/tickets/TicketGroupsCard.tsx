"use client";

import { LayoutList, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const canEdit = sold === 0;
    const itemBody = (
      <>
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
        {!canDelete ? (
          <span className="ml-2 text-xs text-gray-400">已 {sold} 人報名</span>
        ) : null}
      </>
    );
    return (
      <li
        key={item.id ?? `draft-${i}`}
        className="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        {canEdit ? (
          <button
            type="button"
            onClick={() => openPurchaseItemEditor(i)}
            className={`group -mx-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-gray-100 ${
              item.hidden ? "text-gray-400" : "text-gray-700"
            }`}
            aria-label={`編輯 ${item.name}`}
          >
            <span>{itemBody}</span>
            <Pencil className="size-3.5 shrink-0 text-gray-300 group-hover:text-gray-500" />
          </button>
        ) : (
          <span className={item.hidden ? "text-gray-400" : "text-gray-700"}>
            {itemBody}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {options?.showAssignSelect && (
            <select
              className="h-8 rounded-md border border-amber-300 bg-white px-2 text-xs text-gray-700"
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
          {canDelete ? (
            <button
              type="button"
              disabled={purchaseItemDeletingIndex === i}
              onClick={() => deletePurchaseItem(i)}
              className="text-red-500 hover:underline disabled:opacity-50"
              aria-label="刪除票券"
            >
              {purchaseItemDeletingIndex === i ? "刪除中…" : "刪除"}
            </button>
          ) : (
            <button
              type="button"
              disabled={purchaseItemHiddenUpdatingIndex === i}
              onClick={() => setPurchaseItemHidden(i, !item.hidden)}
              className="text-gray-500 hover:underline disabled:opacity-50"
              aria-label={item.hidden ? "在報名表顯示" : "從報名表隱藏"}
            >
              {purchaseItemHiddenUpdatingIndex === i
                ? "更新中…"
                : item.hidden
                  ? "在報名表顯示"
                  : "從報名表隱藏"}
            </button>
          )}
        </div>
      </li>
    );
  };

  const segmentButton = (active: boolean) =>
    `rounded px-2 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-500 hover:text-gray-900"
    }`;

  const handleRemoveGroup = (index: number) => {
    const group = groups[index];
    const ok = window.confirm(
      `刪除區塊「${group?.title || "（未命名區塊）"}」？\n其中的票券會變成「尚未指定區塊」，相關的互斥規則也會一併移除。`
    );
    if (!ok) return;
    removeGroup(index);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <Label>票券內容</Label>
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
            <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              {purchaseItems.map((item, i) => renderItemRow(item, i))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">尚未新增票券。</p>
          )}
          {/* 引導啟用票券區塊（原「群組」功能） */}
          <div className="flex flex-col gap-2 rounded-md border-2 border-dashed border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
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
                className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-[8rem] flex-1 bg-white"
                    placeholder="區塊名稱（如 主票種）"
                    value={group.title}
                    onChange={(e) => updateGroup(gi, "title", e.target.value)}
                    onBlur={() => persistGroup(gi)}
                  />
                  <div
                    className="flex rounded-md bg-gray-200/70 p-0.5"
                    role="group"
                    aria-label="選擇方式"
                  >
                    <button
                      type="button"
                      aria-pressed={group.selectionMode === "single"}
                      className={segmentButton(group.selectionMode === "single")}
                      onClick={() => {
                        updateGroup(gi, "selectionMode", "single");
                        persistGroup(gi, { selectionMode: "single" });
                      }}
                    >
                      單選
                    </button>
                    <button
                      type="button"
                      aria-pressed={group.selectionMode === "multiple"}
                      className={segmentButton(group.selectionMode === "multiple")}
                      onClick={() => {
                        updateGroup(gi, "selectionMode", "multiple");
                        persistGroup(gi, { selectionMode: "multiple" });
                      }}
                    >
                      可複選
                    </button>
                  </div>
                  <div
                    className="flex rounded-md bg-gray-200/70 p-0.5"
                    role="group"
                    aria-label="是否必選"
                  >
                    <button
                      type="button"
                      aria-pressed={group.required}
                      className={segmentButton(group.required)}
                      onClick={() => {
                        updateGroup(gi, "required", true);
                        persistGroup(gi, { required: true });
                      }}
                    >
                      必選
                    </button>
                    <button
                      type="button"
                      aria-pressed={!group.required}
                      className={segmentButton(!group.required)}
                      onClick={() => {
                        updateGroup(gi, "required", false);
                        persistGroup(gi, { required: false });
                      }}
                    >
                      可跳過
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(gi)}
                    className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                    aria-label="刪除區塊"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">{groupRuleSentence(group)}</p>
                {groupItems.length > 0 ? (
                  <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3">
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
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-sm font-medium text-amber-700">
                  尚未指定區塊的票券
                </p>
                <p className="mb-2 text-xs text-amber-700/80">
                  這些票券不會出現在報名表上，請先把它們移到一個區塊。
                </p>
                <ul className="flex flex-col gap-2">
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
