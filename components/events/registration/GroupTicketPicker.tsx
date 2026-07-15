"use client";

import type { EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";

type GroupTicketPickerProps = {
  /** 票券區塊（含各自票券與互斥關係）；空陣列 = 未使用區塊，改用 purchaseItems 平面模式 */
  groups: EventPurchaseItemGroup[];
  /** 平面模式（無區塊）下的票券清單 */
  purchaseItems: EventPurchaseItem[];
  /** 平面模式是否可複選 */
  allowMultiplePurchase: boolean;
  /** 目前生效時段名稱（顯示於價格旁）；null = 無時段 */
  activeTierName: string | null;
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
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        locked
                          ? "cursor-not-allowed border-gray-200"
                          : "cursor-pointer hover:bg-gray-50"
                      } ${
                        isSelected ? "bg-gray-50 border-brand" : "border-gray-200"
                      }`}
                    >
                      <input
                        type={isSingle ? "radio" : "checkbox"}
                        name={`group-${group.id}`}
                        checked={isSelected}
                        disabled={locked}
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
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          ${item.amount}
                          {activeTierName ? (
                            <span className="ml-1 text-xs text-gray-400">
                              （{activeTierName}）
                            </span>
                          ) : null}
                        </div>
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

          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                isSelected ? "bg-gray-50 border-brand" : "border-gray-200"
              }`}
            >
              <input
                type={allowMultiplePurchase ? "checkbox" : "radio"}
                name={allowMultiplePurchase ? `plan-${item.id}` : "plan"}
                checked={isSelected}
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
              <div className="flex-1">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">
                  ${item.amount}
                  {activeTierName ? (
                    <span className="ml-1 text-xs text-gray-400">
                      （{activeTierName}）
                    </span>
                  ) : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
