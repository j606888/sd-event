"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PurchaseItemDraft,
  PriceTierDraft,
  ItemTierPriceDraft,
  PurchaseItemGroupDraft,
} from "@/hooks/use-event-form";

type PurchaseItemDrawerProps = {
  mode: "create" | "edit";
  eventId?: number;
  currentItems: PurchaseItemDraft[];
  priceTiers: PriceTierDraft[];
  groups: PurchaseItemGroupDraft[];
  /** 新增模式的預設所屬區塊 key（`id-<id>` / `draft-<index>`；由區塊卡的「＋新增票券」帶入） */
  defaultGroupKey?: string;
  /** 有值＝編輯既有項目（帶入原值）；無值＝新增 */
  editingItem?: { item: PurchaseItemDraft; index: number };
  onSuccess: (item: PurchaseItemDraft) => void;
  onUpdated?: (index: number, item: PurchaseItemDraft) => void;
  onCancel: () => void;
};

export function PurchaseItemDrawer({
  mode,
  eventId,
  currentItems,
  priceTiers,
  groups,
  defaultGroupKey,
  editingItem,
  onSuccess,
  onUpdated,
  onCancel,
}: PurchaseItemDrawerProps) {
  const isEditing = editingItem != null;

  const tierKeyForPrice = (price: {
    tierId?: number;
    tierDraftIndex?: number;
  }): string | null => {
    if (price.tierId != null) return `id-${price.tierId}`;
    if (price.tierDraftIndex != null) return `draft-${price.tierDraftIndex}`;
    return null;
  };

  const [name, setName] = useState(editingItem?.item.name ?? "");
  const [amount, setAmount] = useState(
    editingItem != null ? String(editingItem.item.amount) : ""
  );
  // 各時段價格（key 為 tier 的 id 或 draft index 的字串）
  const [tierAmounts, setTierAmounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of editingItem?.item.prices ?? []) {
      const k = tierKeyForPrice(p);
      if (k) init[k] = String(p.amount);
    }
    return init;
  });
  // 所屬區塊（key 為 group 的 id 或 draft index 的字串；空 = 未選）
  const [groupKey, setGroupKey] = useState(() => {
    const it = editingItem?.item;
    if (!it) return defaultGroupKey ?? "";
    if (it.groupId != null) return `id-${it.groupId}`;
    if (it.groupDraftIndex != null) return `draft-${it.groupDraftIndex}`;
    return "";
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const useGroups = groups.length > 0;
  const groupKeyOf = (group: PurchaseItemGroupDraft, index: number) =>
    group.id != null ? `id-${group.id}` : `draft-${index}`;
  /** 解析所選群組 key → { groupId } 或 { groupDraftIndex } */
  const resolveGroup = (): { groupId?: number | null; groupDraftIndex?: number } => {
    if (!useGroups || !groupKey) return { groupId: null };
    if (groupKey.startsWith("id-")) return { groupId: Number(groupKey.slice(3)) };
    if (groupKey.startsWith("draft-"))
      return { groupDraftIndex: Number(groupKey.slice(6)) };
    return { groupId: null };
  };

  const tierKey = (tier: PriceTierDraft, index: number) =>
    tier.id != null ? `id-${tier.id}` : `draft-${index}`;

  /** 收集已填的時段價，轉成 draft 用的 prices 陣列 */
  const buildPrices = (): ItemTierPriceDraft[] => {
    const prices: ItemTierPriceDraft[] = [];
    priceTiers.forEach((tier, index) => {
      const raw = tierAmounts[tierKey(tier, index)];
      if (raw == null || raw.trim() === "") return;
      const n = Math.floor(Number(raw));
      if (!Number.isInteger(n) || n < 0) return;
      if (tier.id != null) prices.push({ tierId: tier.id, amount: n });
      else prices.push({ tierDraftIndex: index, amount: n });
    });
    return prices;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const amountNum = Math.floor(Number(amount));
    if (!trimmedName) {
      setError("請輸入名稱");
      return;
    }
    if (!Number.isInteger(amountNum) || amountNum < 0) {
      setError("請輸入有效金額（非負整數）");
      return;
    }
    if (useGroups && !groupKey) {
      setError("請選擇所屬區塊");
      return;
    }
    const prices = buildPrices();
    const group = resolveGroup();

    // ===== 編輯既有項目 =====
    if (isEditing && editingItem) {
      const idx = editingItem.index;
      const existing = editingItem.item;
      const nextDraft: PurchaseItemDraft = {
        id: existing.id,
        name: trimmedName,
        amount: amountNum,
        hidden: existing.hidden ?? false,
        soldCount: existing.soldCount,
        groupId: group.groupId ?? null,
        groupDraftIndex: group.groupDraftIndex,
        prices,
      };
      // 已儲存項目（edit-event 模式）：先打 PATCH 再回傳
      if (existing.id != null && eventId != null) {
        setSubmitting(true);
        try {
          const apiPrices = prices
            .filter((p) => p.tierId != null)
            .map((p) => ({ tierId: p.tierId, amount: p.amount }));
          const res = await fetch(
            `/api/events/${eventId}/purchase-items/${existing.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: trimmedName,
                amount: amountNum,
                groupId: group.groupId ?? null,
                prices: apiPrices,
              }),
            }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error || "更新失敗");
            setSubmitting(false);
            return;
          }
          onUpdated?.(idx, nextDraft);
        } catch {
          setError("更新失敗");
        }
        setSubmitting(false);
        return;
      }
      // 草稿項目（create 模式）：本地取代
      onUpdated?.(idx, nextDraft);
      return;
    }

    if (mode === "edit" && eventId != null) {
      setSubmitting(true);
      try {
        // edit 模式 tier 已有 id，prices 內為 { tierId, amount }
        const apiPrices = prices
          .filter((p) => p.tierId != null)
          .map((p) => ({ tierId: p.tierId, amount: p.amount }));
        const res = await fetch(`/api/events/${eventId}/purchase-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: trimmedName,
            amount: amountNum,
            sortOrder: currentItems.length,
            groupId: group.groupId ?? null,
            prices: apiPrices,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "新增失敗");
          setSubmitting(false);
          return;
        }
        onSuccess({
          id: data.purchaseItem?.id,
          name: trimmedName,
          amount: amountNum,
          hidden: false,
          groupId: group.groupId ?? null,
          prices,
        });
        setName("");
        setAmount("");
        setTierAmounts({});
        setGroupKey("");
        onCancel();
      } catch {
        setError("新增失敗");
      }
      setSubmitting(false);
    } else {
      onSuccess({
        name: trimmedName,
        amount: amountNum,
        hidden: false,
        groupId: group.groupId ?? null,
        groupDraftIndex: group.groupDraftIndex,
        prices,
      });
      setName("");
      setAmount("");
      setTierAmounts({});
      setGroupKey("");
      onCancel();
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-name">名稱 *</Label>
        <Input
          id="item-name"
          placeholder="輸入名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {useGroups && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-group">所屬區塊 *</Label>
          <select
            id="item-group"
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
          >
            <option value="">請選擇區塊</option>
            {groups.map((group, index) => (
              <option key={group.id ?? `draft-${index}`} value={groupKeyOf(group, index)}>
                {group.title || "（未命名區塊）"}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-amount">
          {priceTiers.length > 0 ? "預設金額 *" : "金額 *"}
        </Label>
        {priceTiers.length > 0 && (
          <p className="-mt-1 text-xs text-gray-500">
            某個時段沒填價格時，就會用這個金額。
          </p>
        )}
        <Input
          id="item-amount"
          placeholder="輸入金額"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      {priceTiers.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>各時段價格（選填，留空則用預設金額）</Label>
          {priceTiers.map((tier, index) => {
            const key = tierKey(tier, index);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-sm text-gray-600">
                  {tier.name || "（未命名）"}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder="價格"
                  value={tierAmounts[key] ?? ""}
                  onChange={(e) =>
                    setTierAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="submit"
          className="bg-primary text-white hover:bg-brand-hover"
          disabled={submitting}
        >
          {isEditing
            ? submitting
              ? "儲存中…"
              : "儲存"
            : submitting
              ? "新增中…"
              : "新增"}
        </Button>
      </div>
    </form>
  );
}
