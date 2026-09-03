"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { GroupTicketPicker } from "@/components/events/registration/GroupTicketPicker";
import {
  endOfDayFromDateInput,
  getItemUnitPrice,
  resolveActiveTier,
} from "@/lib/pricing";
import type {
  ItemTierPriceDraft,
  UseEventFormReturn,
} from "@/hooks/use-event-form";
import type { EventPurchaseItem, EventPurchaseItemGroup } from "@/types/event";

/**
 * 報名頁即時預覽：把表單草稿映射成公開報名頁的資料形狀，
 * 直接用真正的 GroupTicketPicker 渲染，讓管理者邊設定邊看到報名者眼中的畫面
 * （單選/複選、必選星號、互斥鎖定變灰、時段價格切換都可實際點按）。
 * 純 client 端試算，不打任何 API。
 */
export function RegistrationPreview({ form }: { form: UseEventFormReturn }) {
  const { purchaseItems, priceTiers, groups, groupExclusions, allowMultiple, autoCalcAmount } =
    form;

  // ---- 時段模擬 ----
  // 與伺服器同一套規則算出「現在」生效的時段；管理者可點 pill 模擬其他時段
  const autoActiveIndex = (() => {
    if (priceTiers.length === 0) return -1;
    const rows = priceTiers.map((t, i) => ({
      id: i,
      name: t.name,
      endsAt: endOfDayFromDateInput(t.endsAt),
      sortOrder: i,
    }));
    const active = resolveActiveTier(rows, new Date());
    return active ? active.id : -1;
  })();
  const [pickedTierIndex, setPickedTierIndex] = useState<number | null>(null);
  const tierIndex = pickedTierIndex ?? autoActiveIndex;
  const activeTierName = tierIndex >= 0 ? priceTiers[tierIndex]?.name ?? null : null;

  // ---- 草稿 → 公開資料形狀（以陣列 index 當合成 id）----
  const tierIndexOfPrice = (p: ItemTierPriceDraft) =>
    p.tierDraftIndex ??
    priceTiers.findIndex((t) => t.id != null && t.id === p.tierId);

  const priceAtTier = (itemIndex: number, tierIdx: number) => {
    const item = purchaseItems[itemIndex];
    const mapped = (item.prices ?? [])
      .map((p) => ({ tierId: tierIndexOfPrice(p), amount: p.amount }))
      .filter((p) => p.tierId >= 0);
    return getItemUnitPrice(item.amount, mapped, tierIdx >= 0 ? tierIdx : null);
  };
  const priceOf = (itemIndex: number) => priceAtTier(itemIndex, tierIndex);
  // 原價＝最後一段（一般／現場）；預覽切到最後一段時省錢徽章自然消失
  const lastTierIndex = priceTiers.length - 1;
  const fullTierName =
    lastTierIndex >= 0 ? priceTiers[lastTierIndex]?.name ?? null : null;

  const groupKeyToIndex = (key: string): number => {
    if (key.startsWith("draft-")) return Number(key.slice(6));
    if (key.startsWith("id-")) {
      const id = Number(key.slice(3));
      return groups.findIndex((g) => g.id === id);
    }
    return -1;
  };

  const excludesByGroupIndex = new Map<number, number[]>();
  for (const [a, b] of groupExclusions) {
    const ia = groupKeyToIndex(a);
    const ib = groupKeyToIndex(b);
    if (ia < 0 || ib < 0) continue;
    excludesByGroupIndex.set(ia, [...(excludesByGroupIndex.get(ia) ?? []), ib]);
    excludesByGroupIndex.set(ib, [...(excludesByGroupIndex.get(ib) ?? []), ia]);
  }

  const itemGroupIndex = (itemIndex: number): number => {
    const item = purchaseItems[itemIndex];
    if (item.groupDraftIndex != null) return item.groupDraftIndex;
    if (item.groupId != null)
      return groups.findIndex((g) => g.id === item.groupId);
    return -1;
  };

  const toPublicItem = (itemIndex: number): EventPurchaseItem => ({
    id: itemIndex,
    name: purchaseItems[itemIndex].name || "（未命名票券）",
    amount: priceOf(itemIndex),
    fullAmount: priceAtTier(itemIndex, lastTierIndex),
  });

  // 與公開報名頁一致：隱藏票券不出現
  const visibleIndexes = purchaseItems
    .map((_, i) => i)
    .filter((i) => purchaseItems[i].hidden !== true);

  const publicGroups: EventPurchaseItemGroup[] = groups.map((g, gi) => ({
    id: gi,
    title: g.title || "（未命名區塊）",
    selectionMode: g.selectionMode,
    required: g.required,
    sortOrder: gi,
    items: visibleIndexes.filter((i) => itemGroupIndex(i) === gi).map(toPublicItem),
    excludesGroupIds: excludesByGroupIndex.get(gi) ?? [],
  }));

  const publicFlatItems: EventPurchaseItem[] = visibleIndexes.map(toPublicItem);

  // ---- 預覽自身的選取狀態 ----
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, number[]>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([]);

  const selectedItemIndexes =
    groups.length > 0
      ? Object.values(selectedByGroup).flat()
      : selectedPlanId != null
        ? [selectedPlanId]
        : selectedPlanIds;
  const total = selectedItemIndexes.reduce(
    (sum, i) => (purchaseItems[i] ? sum + priceOf(i) : sum),
    0
  );
  const autoCalc = groups.length > 0 || autoCalcAmount;

  const hasAnythingToShow = visibleIndexes.length > 0 || groups.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-white p-4 shadow-sm">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Eye className="size-4 text-brand" />
          報名頁即時預覽
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          這是報名者將看到的票券選擇畫面，可以實際點選試試。
        </p>
      </div>

      {priceTiers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500">預覽票價時段：</span>
          {priceTiers.map((tier, i) => (
            <button
              key={tier.id ?? `draft-${i}`}
              type="button"
              onClick={() => setPickedTierIndex(i === tierIndex ? null : i)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                i === tierIndex
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {tier.name || "（未命名）"}
              {i === autoActiveIndex && (
                <span className="ml-1 text-[10px] text-gray-400">目前適用</span>
              )}
            </button>
          ))}
        </div>
      )}

      {hasAnythingToShow ? (
        <div className="space-y-5 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
          <GroupTicketPicker
            groups={publicGroups}
            purchaseItems={publicFlatItems}
            allowMultiplePurchase={allowMultiple}
            activeTierName={activeTierName}
            fullTierName={fullTierName}
            selectedByGroup={selectedByGroup}
            selectedPlanId={selectedPlanId}
            selectedPlanIds={selectedPlanIds}
            onSelectedByGroupChange={setSelectedByGroup}
            onSelectedPlanChange={(planId, planIds) => {
              setSelectedPlanId(planId);
              setSelectedPlanIds(planIds);
            }}
          />
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm">
            {autoCalc ? (
              <>
                <span className="text-gray-500">總金額（自動計算）</span>
                <span className="font-semibold text-gray-900">${total}</span>
              </>
            ) : (
              <span className="text-gray-500">報名者自行填寫金額</span>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
          新增票券後，這裡會即時顯示報名頁的樣子。
        </p>
      )}
    </div>
  );
}
