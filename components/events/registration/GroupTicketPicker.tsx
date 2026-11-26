"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { TicketPriceLine, useSaleStatusLabel } from "./TicketPriceLine";
import type { EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";
import { seatCountOf } from "@/lib/seat-count";
import { isItemOnSale } from "@/lib/pricing";
import { isComboGroup, priceGroupSelection } from "@/lib/combo-pricing";
import { ComboHint, ComboLadder } from "./ComboLadder";
import { ItemSessionLine } from "./ItemSchedule";

/** 票券名稱下方的資訊：套票人數提示、票券說明、目前時段 */
function TicketItemInfo({
  item,
  activeTierName,
  venue,
}: {
  item: EventPurchaseItem;
  activeTierName: string | null;
  /** showVenue：活動有多個場地時每張票都標場地；differs：跟先勾的票不同場地 */
  venue?: { showVenue: boolean; differs: boolean };
}) {
  const t = useTranslations("publicEvent.ticketPicker");
  const seats = seatCountOf(item);
  return (
    <div className="min-w-0">
      <div className="font-medium text-gray-900">{item.name}</div>
      <ItemSessionLine item={item} showVenue={venue?.showVenue ?? false} className="mt-0.5 text-xs text-gray-600" />
      {venue?.differs && (
        <div className="mt-1 inline-flex rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-800">
          {t("differentVenue")}
        </div>
      )}
      {seats > 1 && (
        <div className="mt-1 inline-flex items-center gap-1 rounded bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand-strong">
          <Users className="size-3" />
          <span>{t("bundleBadge", { seats })}</span>
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
  const t = useTranslations("publicEvent.ticketPicker");
  const saleStatusLabel = useSaleStatusLabel();

  // 不同堂課在不同場地：每張票標場地，跟第一張勾選的票不同場地的票標「不同場地」提醒
  const allItems = groups.length > 0 ? groups.flatMap((g) => g.items) : purchaseItems;
  const venueKeyOf = (item: EventPurchaseItem) => item.location?.id ?? "event";
  const multiVenue = new Set(allItems.map(venueKeyOf)).size > 1;
  const selectedIds = new Set<number>(
    groups.length > 0
      ? Object.values(selectedByGroup).flat()
      : [...selectedPlanIds, ...(selectedPlanId != null ? [selectedPlanId] : [])]
  );
  const firstSelected = allItems.find((i) => selectedIds.has(i.id));
  // 只提醒「會一起買」的票：單選區塊裡已經有選的話，改選其他票是取代，不是多買一堂
  const canAddAlongside = (item: EventPurchaseItem) => {
    if (groups.length === 0) return allowMultiplePurchase;
    const group = item.groupId != null ? groupById.get(item.groupId) : undefined;
    if (!group || group.selectionMode === "multiple") return true;
    return (selectedByGroup[group.id] ?? []).length === 0;
  };
  const venueOf = (item: EventPurchaseItem) => ({
    showVenue: multiVenue,
    differs:
      multiVenue &&
      firstSelected != null &&
      canAddAlongside(item) &&
      venueKeyOf(item) !== venueKeyOf(firstSelected),
  });
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

  // 組合價：目前選取下哪些票被附贈（顯示「已含」並鎖住），以及附贈來自哪個組合
  const lockedGroupIds = new Set(
    groups.filter((g) => getLockingGroup(g) != null).map((g) => g.id)
  );
  const activeSelectedIds = groups
    .filter((g) => !lockedGroupIds.has(g.id))
    .flatMap((g) => selectedByGroup[g.id] ?? []);
  const { lines: pricedLines } = priceGroupSelection(groups, activeSelectedIds);
  const giftTitleById = new Map(
    pricedLines.filter((l) => l.isGift).map((l) => [l.itemId, l.comboTitle] as const)
  );
  const itemNameById = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, i.name] as const)));
  const giftName = (itemId: number) => itemNameById.get(itemId) ?? null;

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
                <span>{group.title}</span>
                {group.required ? (
                  <span className="ml-1 text-red-500">*</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {t("optional")}
                  </span>
                )}
                {locked && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {t("lockedBy", { group: lockingGroup!.title })}
                  </span>
                )}
              </h2>
              {isComboGroup(group) && (
                <ComboLadder
                  group={group}
                  activeCount={locked ? undefined : selected.length}
                  giftName={giftName}
                />
              )}
              <div className="space-y-2">
                {group.items.map((item) => {
                  // 組合價附贈的票：顯示已勾、不可取消、不另收費
                  const gifted = !locked && giftTitleById.has(item.id);
                  const giftTitle = giftTitleById.get(item.id) ?? null;
                  const isSelected = gifted || selected.includes(item.id);
                  // 時段限定票（如早鳥限定）不在目前時段販售：保留顯示但不可選
                  const offSale = !isItemOnSale(item);
                  const disabled = locked || offSale || gifted;
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
                        className="w-4 h-4 text-brand-strong border-gray-300 focus:ring-brand"
                      />
                      <div className="flex flex-1 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <TicketItemInfo
                            item={item}
                            activeTierName={isComboGroup(group) ? null : activeTierName}
                            venue={venueOf(item)}
                          />
                          {gifted && (
                            <div className="mt-1 inline-flex rounded bg-butter-soft px-1.5 py-0.5 text-xs font-medium text-butter-ink">
                              {giftTitle
                                ? t("giftIncluded", { title: giftTitle })
                                : t("giftIncludedUntitled")}
                            </div>
                          )}
                        </div>
                        {gifted ? (
                          <span className="shrink-0 text-sm font-medium text-butter-ink">
                            {t("giftFree")}
                          </span>
                        ) : isComboGroup(group) ? null : (
                          <TicketPriceLine
                            variant="picker"
                            amount={item.amount}
                            fullAmount={item.fullAmount}
                            fullTierName={fullTierName}
                            seatCount={item.seatCount}
                            unavailableLabel={saleStatusLabel(item)}
                          />
                        )}
                      </div>
                    </label>
                  );
                })}
                {isComboGroup(group) && !locked && (
                  <ComboHint group={group} count={selected.length} giftName={giftName} />
                )}
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
                      className="w-4 h-4 text-brand-strong border-gray-300 focus:ring-brand"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t("noneOption")}</div>
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
      <h2 className="font-semibold text-gray-900">{t("chooseTicket")}</h2>
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
                className="w-4 h-4 text-brand-strong border-gray-300 focus:ring-brand"
              />
              <div className="flex flex-1 items-start justify-between gap-3">
                <TicketItemInfo item={item} activeTierName={activeTierName} venue={venueOf(item)} />
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
