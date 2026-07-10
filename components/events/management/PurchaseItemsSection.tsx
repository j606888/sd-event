"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PurchaseItemDraft,
  PriceTierDraft,
  PurchaseItemGroupDraft,
  CouponDraft,
} from "@/hooks/use-event-form";

type PurchaseItemsSectionProps = {
  items: PurchaseItemDraft[];
  autoCalcAmount: boolean;
  priceTiers: PriceTierDraft[];
  groups: PurchaseItemGroupDraft[];
  coupons: CouponDraft[];
  onAddCoupon: () => void;
  onUpdateCoupon: <K extends keyof CouponDraft>(
    index: number,
    field: K,
    value: CouponDraft[K]
  ) => void;
  onPersistCoupon: (index: number) => void;
  onRemoveCoupon: (index: number) => void;
  onAutoCalcAmountChange: (value: boolean) => void;
  onAddClick: () => void;
  onEditItem: (index: number) => void;
  onDeleteItem: (index: number) => void;
  itemDeletingIndex: number | null;
  onSetItemHidden: (index: number, hidden: boolean) => void;
  itemHiddenUpdatingIndex: number | null;
  onAddTier: () => void;
  onUpdateTier: (index: number, field: "name" | "endsAt", value: string) => void;
  onPersistTier: (index: number) => void;
  onRemoveTier: (index: number) => void;
  onAddGroup: () => void;
  onUpdateGroup: <K extends keyof PurchaseItemGroupDraft>(
    index: number,
    field: K,
    value: PurchaseItemGroupDraft[K]
  ) => void;
  onPersistGroup: (index: number) => void;
  onRemoveGroup: (index: number) => void;
  isGroupExcluded: (keyA: string, keyB: string) => boolean;
  onToggleGroupExclusion: (keyA: string, keyB: string) => void;
};

export function PurchaseItemsSection({
  items,
  autoCalcAmount,
  priceTiers,
  groups,
  coupons,
  onAddCoupon,
  onUpdateCoupon,
  onPersistCoupon,
  onRemoveCoupon,
  onAutoCalcAmountChange,
  onAddClick,
  onEditItem,
  onDeleteItem,
  itemDeletingIndex,
  onSetItemHidden,
  itemHiddenUpdatingIndex,
  onAddTier,
  onUpdateTier,
  onPersistTier,
  onRemoveTier,
  onAddGroup,
  onUpdateGroup,
  onPersistGroup,
  onRemoveGroup,
  isGroupExcluded,
  onToggleGroupExclusion,
}: PurchaseItemsSectionProps) {
  const useGroups = groups.length > 0;
  // 折扣碼僅在伺服器能權威計算金額的活動生效（與後端 registrations route 的規則一致）
  const couponsSupported = useGroups || autoCalcAmount;

  // 進階選項預設收合；若活動已設定群組則自動展開。使用者手動切換後以 override 為準。
  // 完全由 render 推導，避免 effect / ref 連鎖（亦相容群組非同步載入）。
  const [advancedOverride, setAdvancedOverride] = useState<boolean | null>(null);
  const advancedOpen = advancedOverride ?? useGroups;
  const toggleAdvanced = () => setAdvancedOverride(!advancedOpen);

  // 把每個項目的原始 index 一併帶上，方便 onDeleteItem / onSetItemHidden 操作
  const indexedItems = items.map((item, index) => ({ item, index }));
  const groupKeyOf = (group: PurchaseItemGroupDraft, groupIndex: number) =>
    group.id != null ? `id-${group.id}` : `draft-${groupIndex}`;
  const itemGroupKey = (item: PurchaseItemDraft) => {
    if (item.groupId != null) return `id-${item.groupId}`;
    if (item.groupDraftIndex != null) return `draft-${item.groupDraftIndex}`;
    return null;
  };

  const renderItemRow = (item: PurchaseItemDraft, i: number) => {
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
        key={item.id ?? i}
        className="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEditItem(i)}
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
          {canDelete ? (
            <button
              type="button"
              disabled={itemDeletingIndex === i}
              onClick={() => onDeleteItem(i)}
              className="text-red-500 hover:underline disabled:opacity-50"
              aria-label="刪除項目"
            >
              {itemDeletingIndex === i ? "刪除中…" : "刪除"}
            </button>
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
    );
  };

  return (
    <div className="flex flex-col gap-3">
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
              <li
                key={tier.id ?? `draft-${i}`}
                className="flex items-center gap-2"
              >
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

      {/* 購買項目清單 */}
      <div className="flex items-center justify-between">
        <Label>購買項目</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onAddClick}
        >
          <Plus className="size-4" />
          新增項目
        </Button>
      </div>

      {items.length > 0 &&
        (useGroups ? (
          <div className="flex flex-col gap-3">
            {groups.map((group, gi) => {
              const groupItems = indexedItems.filter(
                ({ item }) => itemGroupKey(item) === groupKeyOf(group, gi)
              );
              return (
                <div
                  key={group.id ?? `draft-${gi}`}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    {group.title || "（未命名群組）"}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {group.selectionMode === "multiple" ? "複選" : "擇一"}
                      {group.required ? "・必選" : "・選填"}
                    </span>
                  </p>
                  {groupItems.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {groupItems.map(({ item, index }) =>
                        renderItemRow(item, index)
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400">尚無項目</p>
                  )}
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
                  <p className="mb-2 text-sm font-medium text-amber-700">
                    未分組（請指派群組）
                  </p>
                  <ul className="flex flex-col gap-2">
                    {ungrouped.map(({ item, index }) =>
                      renderItemRow(item, index)
                    )}
                  </ul>
                </div>
              );
            })()}
          </div>
        ) : (
          <ul className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
            {items.map((item, i) => renderItemRow(item, i))}
          </ul>
        ))}

      {/* 折扣碼：折固定金額（整筆折一次）或打折（%），可設使用次數上限 */}
      <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <Label>折扣碼（選填）</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onAddCoupon}
            disabled={!couponsSupported}
          >
            <Plus className="size-4" />
            新增折扣碼
          </Button>
        </div>
        {couponsSupported ? (
          <p className="text-xs text-gray-500">
            報名者輸入折扣碼後自動調整金額。固定金額為整筆報名折一次；打折以折扣百分比計（10 = 打九折）。
            使用上限留空＝不限次數。
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            折扣碼僅支援自動計算金額的活動（使用票種群組，或關閉「使用者自行填寫金額」）。
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
                    onUpdateCoupon(i, "code", e.target.value.toUpperCase())
                  }
                  onBlur={() => onPersistCoupon(i)}
                />
                <select
                  className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={coupon.discountType}
                  onChange={(e) => {
                    onUpdateCoupon(
                      i,
                      "discountType",
                      e.target.value === "percent" ? "percent" : "fixed"
                    );
                    onPersistCoupon(i);
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
                  onChange={(e) => onUpdateCoupon(i, "value", e.target.value)}
                  onBlur={() => onPersistCoupon(i)}
                  aria-label="折扣數值"
                />
                <Input
                  className="w-24 bg-white"
                  type="number"
                  min={1}
                  placeholder="不限"
                  value={coupon.usageLimit}
                  onChange={(e) => onUpdateCoupon(i, "usageLimit", e.target.value)}
                  onBlur={() => onPersistCoupon(i)}
                  aria-label="使用上限"
                />
                {(coupon.usedCount ?? 0) > 0 && (
                  <span className="text-xs text-gray-400">
                    已用 {coupon.usedCount} 次
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveCoupon(i)}
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

      {/* 分隔線：把「主要設定」與「進階設定」明顯分層 */}
      <div className="mt-2 flex items-center gap-3 text-xs font-medium text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        進階設定
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {/* 進階：票種群組、互斥規則 — 白底齒輪卡片，與上方灰底購買項目區隔 */}
      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={advancedOpen}
          className="flex w-full items-center gap-3 px-3 py-3 text-left"
        >
          <Settings2 className="size-5 shrink-0 text-gray-500" />
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-gray-800">票種群組與規則</span>
            <span className="text-xs text-gray-500">
              把購買項目分組並設定擇一／複選／互斥規則。多數活動（一般 Party）不需要。
            </span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${
              advancedOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-3 border-t border-gray-200 p-3">
            {/* 購買規則（使用群組時改由各群組規則決定） */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm">購買規則</Label>
              {useGroups ? (
                <p className="text-xs text-gray-500">
                  已使用票種群組，金額計算改由各群組規則決定。
                </p>
              ) : (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!autoCalcAmount}
                    onChange={(e) => onAutoCalcAmountChange(!e.target.checked)}
                    className="size-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">
                    使用者自行填寫金額（關閉自動加總）
                  </span>
                </label>
              )}
            </div>

            {/* 票種群組：擇一 / 複選 / 是否必選，報名頁依群組規則渲染 */}
            <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <Label>票種群組</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={onAddGroup}
                >
                  <Plus className="size-4" />
                  新增群組
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                建立群組後，每個購買項目須歸屬一個群組，報名頁依群組規則渲染（擇一＝radio、複選＝checkbox）並自動算金額。
              </p>
              {groups.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {groups.map((group, i) => {
                    const groupKey = groupKeyOf(group, i);
                    const otherGroups = groups
                      .map((g, gi) => ({ g, gi }))
                      .filter(({ gi }) => gi !== i);
                    return (
                      <li
                        key={group.id ?? `draft-${i}`}
                        className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            className="min-w-[8rem] flex-1 bg-white"
                            placeholder="群組名稱（如 主票種）"
                            value={group.title}
                            onChange={(e) =>
                              onUpdateGroup(i, "title", e.target.value)
                            }
                            onBlur={() => onPersistGroup(i)}
                          />
                          <select
                            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                            value={group.selectionMode}
                            onChange={(e) => {
                              onUpdateGroup(
                                i,
                                "selectionMode",
                                e.target.value === "multiple"
                                  ? "multiple"
                                  : "single"
                              );
                              onPersistGroup(i);
                            }}
                            aria-label="選擇模式"
                          >
                            <option value="single">擇一</option>
                            <option value="multiple">複選</option>
                          </select>
                          <label className="flex cursor-pointer items-center gap-1 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={group.required}
                              onChange={(e) => {
                                onUpdateGroup(i, "required", e.target.checked);
                                onPersistGroup(i);
                              }}
                              className="size-4 rounded border-gray-300"
                            />
                            必選
                          </label>
                          <button
                            type="button"
                            onClick={() => onRemoveGroup(i)}
                            className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                            aria-label="移除群組"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        {otherGroups.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-gray-500">
                            <span>互斥群組：</span>
                            {otherGroups.map(({ g, gi }) => {
                              const otherKey = groupKeyOf(g, gi);
                              return (
                                <label
                                  key={g.id ?? `draft-${gi}`}
                                  className="flex cursor-pointer items-center gap-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isGroupExcluded(groupKey, otherKey)}
                                    onChange={() =>
                                      onToggleGroupExclusion(groupKey, otherKey)
                                    }
                                    className="size-3.5 rounded border-gray-300"
                                  />
                                  {g.title || "（未命名）"}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
