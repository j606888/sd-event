"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PurchaseItemDraft = { id?: number; name: string; amount: number };

type PurchaseItemDrawerProps = {
  mode: "create" | "edit";
  eventId?: number;
  currentItems: PurchaseItemDraft[];
  onSuccess: (item: PurchaseItemDraft) => void;
  onCancel: () => void;
};

export function PurchaseItemDrawer({
  mode,
  eventId,
  currentItems,
  onSuccess,
  onCancel,
}: PurchaseItemDrawerProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (mode === "edit" && eventId != null) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/events/${eventId}/purchase-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: trimmedName,
            amount: amountNum,
            sortOrder: currentItems.length,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "新增失敗");
          setSubmitting(false);
          return;
        }
        onSuccess({ id: data.item?.id, name: trimmedName, amount: amountNum });
        setName("");
        setAmount("");
        onCancel();
      } catch {
        setError("新增失敗");
      }
      setSubmitting(false);
    } else {
      onSuccess({ name: trimmedName, amount: amountNum });
      setName("");
      setAmount("");
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
        <Label htmlFor="item-amount">金額 *</Label>
        <Input
          id="item-amount"
          placeholder="輸入金額"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
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
