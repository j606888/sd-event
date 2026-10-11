"use client";

import { Users } from "lucide-react";
import { TicketPriceLine } from "./TicketPriceLine";
import type { EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";
import { seatCountOf } from "@/lib/seat-count";
import { isItemOnSale, saleStatusLabel } from "@/lib/pricing";

/** 票券名稱下方的資訊：套票人數提示、票券說明、目前時段 */
function TicketItemInfo({
  item,
  activeTierName,
}: {
  item: EventPurchaseItem;
  activeTierName: string | null;
}) {
  const seats = seatCountOf(item);
  return (
    <div className="min-w-0">
      <div className="font-medium text-gray-900">{item.name}</div>
      {seats > 1 && (
        <div className="mt-1 inline-flex items-center gap-1 rounded bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">
          <Users className="size-3" />
          {seats} 人套票 · 需填 {seats} 位參加者
        </div>
      )}
      {item.description && (
        <div className="mt-1 whitespace-pre-line text-xs text-gray-600">
          {item.description}
        </div>
      )}
      {activeTierName && isItemOnSale(item) && (
        <div className="mt-0.5 text-xs text-gray-400">{activeTierName}</div>
      )}
    </div>
  );
}

type GroupTicketPickerProps = {
  /** 票券區塊（含各自票券與互斥關係）；空陣列 = 未使用區塊，改用 purchaseItems 平面模式 */
  groups: EventPurchaseItemGroup[];
  /** 平面模式（無區塊）下的票券清單 */
  purchaseItems: EventPurchaseItem[];
  /** 平面模式是否可複選 */
  allowMultiplePurchase: boolean;
  /** 目前生效時段名稱（顯示於價格旁）；null = 無時段 */
  activeTierName: string | null;
  /** 原價（最後一段）時段名稱，供「現省」的說明文字；null = 無時段 */
  fullTierName?: string | null;
  selectedByGroup: Record<number, number[]>;
  selectedPlanId: number | null;
  selectedPlanIds: number[];
  onSelectedByGroupChange: (next: Record<number, number[]>) => void;
  onSelectedPlanChange: (planId: number | null, planIds: number[]) => void;
};

/**
 * 報名頁的票券選擇區塊（純 presentational）。
 * 公開報名表（ApplicationFormStep）與後台「報名頁即時預覽」共用，
 * 確保管理者看到的預覽與報名者實際看到的行為一致。
 */
export function GroupTicketPicker({
  groups,
  purchaseItems,
  allowMultiplePurchase,
  activeTierName,
  fullTierName,
  selectedByGroup,
  selectedPlanId,
  selectedPlanIds,
  onSelectedByGroupChange,
  onSelectedPlanChange,
}: GroupTicketPickerProps) {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  // 若某互斥群組已有選取，回傳「鎖住本群組的那個群組」，否則 null
  const getLockingGroup = (group: EventPurchaseItemGroup) => {
    for (const exId of group.excludesGroupIds ?? []) {
      const other = groupById.get(exId);
      if (other && (selectedByGroup[exId]?.length ?? 0) > 0) {
        return other;
      }
    }
    return null;
  };

  if (groups.length > 0) {
    // 群組模式：依區塊規則渲染（single=radio、multiple=checkbox）
    return (
      <>
        {groups.map((group) => {
          const lockingGroup = getLockingGroup(group);
          const locked = lockingGroup != null;
          const selected = locked ? [] : selectedByGroup[group.id] ?? [];
          const isSingle = group.selectionMode === "single";
          // 選了會觸發互斥的項目時，一併清空被本群組鎖住的其他群組
          const setGroupSelection = (ids: number[]) => {
            const next = { ...selectedByGroup, [group.id]: ids };
            if (ids.length > 0) {
              for (const exId of group.excludesGroupIds ?? []) {
                next[exId] = [];
              }
            }
            onSelectedByGroupChange(next);
          };
          return (
            <div
              key={group.id}
              className={`space-y-3 ${locked ? "opacity-50" : ""}`}
            >
              <h2 className="font-semibold text-gray-900">
                {group.title}
                {group.required ? (
                  <span className="ml-1 text-red-500">*</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    （選填）
                  </span>
                )}
                {locked && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    （已包含於「{lockingGroup!.title}」）
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const isSelected = selected.includes(item.id);
                  // 時段限定票（如早鳥限定）不在目前時段販售：保留顯示但不可選
                  const offSale = !isItemOnSale(item);
                  const disabled = locked || offSale;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        disabled
                          ? "cursor-not-allowed border-gray-200"
                          : "cursor-pointer hover:bg-gray-50"
                      } ${
                        isSelected ? "bg-gray-50 border-brand" : "border-gray-200"
                      } ${offSale && !locked ? "opacity-60" : ""}`}
                    >
                      <input
                        type={isSingle ? "radio" : "checkbox"}
                        name={`group-${group.id}`}
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => {
                          if (isSingle) {
                            setGroupSelection([item.id]);
                          } else {
                            setGroupSelection(
                              isSelected
                                ? selected.filter((id) => id !== item.id)
                                : [...selected, item.id]
                            );
                          }
                        }}
                        className="w-4 h-4 text-brand border-gray-300 focus:ring-brand"
                      />
                      <div className="flex flex-1 items-start justify-between gap-3">
                        <TicketItemInfo
                          item={item}
                          activeTierName={activeTierName}
                        />
                        <TicketPriceLine
                          variant="picker"
                          amount={item.amount}
                          fullAmount={item.fullAmount}
                          fullTierName={fullTierName}
                          seatCount={item.seatCount}
                          unavailableLabel={saleStatusLabel(item)}
                        />
                      </div>
                    </label>
                  );
                })}
                {/* 選填 + 擇一群組：提供「不需要」選項以清除選取 */}
                {isSingle && !group.required && !locked && (
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      selected.length === 0
                        ? "bg-gray-50 border-brand"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`group-${group.id}`}
                      checked={selected.length === 0}
                      onChange={() => setGroupSelection([])}
                      className="w-4 h-4 text-brand border-gray-300 focus:ring-brand"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">不需要</div>
                    </div>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900">選擇方案</h2>
      <div className="space-y-2">
        {purchaseItems.map((item) => {
          const isSelected = allowMultiplePurchase
            ? selectedPlanIds.includes(item.id)
            : selectedPlanId === item.id;
          const offSale = !isItemOnSale(item);

          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                offSale ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-gray-50"
              } ${isSelected ? "bg-gray-50 border-brand" : "border-gray-200"}`}
            >
              <input
                type={allowMultiplePurchase ? "checkbox" : "radio"}
                name={allowMultiplePurchase ? `plan-${item.id}` : "plan"}
                checked={isSelected}
                disabled={offSale}
                onChange={() => {
                  if (allowMultiplePurchase) {
                    const newIds = isSelected
                      ? selectedPlanIds.filter((id) => id !== item.id)
                      : [...selectedPlanIds, item.id];
                    onSelectedPlanChange(null, newIds);
                  } else {
                    onSelectedPlanChange(item.id, []);
                  }
                }}
                className="w-4 h-4 text-brand border-gray-300 focus:ring-brand"
              />
              <div className="flex flex-1 items-start justify-between gap-3">
                <TicketItemInfo item={item} activeTierName={activeTierName} />
                <TicketPriceLine
                  variant="picker"
                  amount={item.amount}
                  fullAmount={item.fullAmount}
                  fullTierName={fullTierName}
                  seatCount={item.seatCount}
                  unavailableLabel={saleStatusLabel(item)}
                />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
