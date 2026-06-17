"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PurchaseItemDraft,
  PriceTierDraft,
  ItemTierPriceDraft,
} from "@/hooks/use-event-form";

type PurchaseItemDrawerProps = {
  mode: "create" | "edit";
  eventId?: number;
  currentItems: PurchaseItemDraft[];
  priceTiers: PriceTierDraft[];
  onSuccess: (item: PurchaseItemDraft) => void;
  onCancel: () => void;
};

export function PurchaseItemDrawer({
  mode,
  eventId,
  currentItems,
  priceTiers,
  onSuccess,
  onCancel,
}: PurchaseItemDrawerProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  // 各時段價格（key 為 tier 的 id 或 draft index 的字串）
  const [tierAmounts, setTierAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const prices = buildPrices();

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
          prices,
        });
        setName("");
        setAmount("");
        setTierAmounts({});
        onCancel();
      } catch {
        setError("新增失敗");
      }
      setSubmitting(false);
    } else {
      onSuccess({ name: trimmedName, amount: amountNum, hidden: false, prices });
      setName("");
      setAmount("");
      setTierAmounts({});
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-amount">
          {priceTiers.length > 0 ? "預設金額 *（時段未填價時的 fallback）" : "金額 *"}
        </Label>
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
          className="bg-gray-900 text-white hover:bg-gray-800"
          disabled={submitting}
        >
          {submitting ? "新增中…" : "新增"}
        </Button>
      </div>
    </form>
  );
}
