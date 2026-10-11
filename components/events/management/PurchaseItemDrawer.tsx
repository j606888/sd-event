"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_MIN_FLAGGED } from "@/lib/attendee-flag";
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
  /** 活動的參加者勾選項目名稱（如「參加伸展台比賽」）；空 = 未設定，不顯示「至少勾選幾位」 */
  attendeeFlagLabel?: string;
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
  attendeeFlagLabel,
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
      if (k && p.available !== false) init[k] = String(p.amount);
    }
    return init;
  });
  // 不販售的時段（key 同上）：如「1+1 早鳥優惠票」只在早鳥段開賣，之後報名頁顯示已截止
  const [offSaleTiers, setOffSaleTiers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const p of editingItem?.item.prices ?? []) {
      const k = tierKeyForPrice(p);
      if (k && p.available === false) init[k] = true;
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
  // 每張票人數：1 = 一般票；>1 = 套票（如雙人票，整組價、報名須剛好填這麼多位參加者）
  const [seatCount, setSeatCount] = useState(
    String(editingItem?.item.seatCount ?? 1)
  );
  const [description, setDescription] = useState(
    editingItem?.item.description ?? ""
  );
  // 至少幾位參加者要勾選活動的勾選項目（如 1+1 套票其中一人須參加伸展台比賽）；0 = 不要求
  const [minFlagged, setMinFlagged] = useState(
    String(editingItem?.item.minFlagged ?? 0)
  );
  const flagLabel = attendeeFlagLabel?.trim() ?? "";
  // 活動未設勾選項目時隱藏此欄；但既有設定 > 0 仍顯示，讓主辦可以清掉
  const showMinFlagged = flagLabel !== "" || (editingItem?.item.minFlagged ?? 0) > 0;
  // 已售出的票不可改人數（後端也會擋），避免既有報名的收費與統計對不起來
  const seatCountLocked = (editingItem?.item.soldCount ?? 0) > 0;
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

  /**
   * 有設票價時段時，價格一律由「每段各填一次」決定，不再另外問一次「預設金額」。
   *
   * `eventPurchaseItems.amount` 的角色本來就是「未設時段價時的 fallback」
   *（見 docs/ticketing-architecture.md §3），而最後一段就是那個 fallback 段，
   * 所以直接把最後一段的價格寫回 amount —— 使用者不必把同一個數字打兩次。
   */
  const useTiers = priceTiers.length > 0;
  const isOnSale = (key: string) => offSaleTiers[key] !== true;
  // 基準價取「最後一個有販售的時段」：早鳥限定票的基準價就是早鳥價
  const onSaleTierKeys = priceTiers
    .map((tier, index) => tierKey(tier, index))
    .filter(isOnSale);
  const baseTierKey = onSaleTierKeys.at(-1) ?? null;
  const baseTierName = (() => {
    const index = priceTiers.findIndex((tier, i) => tierKey(tier, i) === baseTierKey);
    return index >= 0 ? priceTiers[index].name || `第 ${index + 1} 段` : null;
  })();
  const lastTierOnSale =
    useTiers && isOnSale(tierKey(priceTiers[priceTiers.length - 1], priceTiers.length - 1));

  const parseTierAmount = (raw: string | undefined): number | null => {
    if (raw == null || raw.trim() === "") return null;
    const n = Math.floor(Number(raw));
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  /** 有販售的每段都要有價；回傳第一個沒填好的時段名稱 */
  const firstUnpricedTier = (): string | null => {
    for (const [index, tier] of priceTiers.entries()) {
      const key = tierKey(tier, index);
      if (isOnSale(key) && parseTierAmount(tierAmounts[key]) == null) {
        return tier.name || `第 ${index + 1} 段`;
      }
    }
    return null;
  };

  /** 收集各時段價，轉成 draft 用的 prices 陣列 */
  const buildPrices = (): ItemTierPriceDraft[] => {
    const prices: ItemTierPriceDraft[] = [];
    priceTiers.forEach((tier, index) => {
      const key = tierKey(tier, index);
      const ref = tier.id != null ? { tierId: tier.id } : { tierDraftIndex: index };
      if (!isOnSale(key)) {
        prices.push({ ...ref, amount: 0, available: false });
        return;
      }
      const n = parseTierAmount(tierAmounts[key]);
      if (n == null) return;
      prices.push({ ...ref, amount: n });
    });
    return prices;
  };

  /** 把第一個填好的價格帶進其餘空欄位，省得同樣的數字打好幾次 */
  const fillEmptyTiersFromFirst = () => {
    const firstFilled = onSaleTierKeys
      .map((key) => tierAmounts[key])
      .find((raw) => parseTierAmount(raw) != null);
    if (firstFilled == null) return;
    setTierAmounts((prev) => {
      const next = { ...prev };
      priceTiers.forEach((tier, index) => {
        const key = tierKey(tier, index);
        if (isOnSale(key) && parseTierAmount(next[key]) == null) next[key] = firstFilled;
      });
      return next;
    });
  };

  const seatCountNum = Number(seatCount);
  const isBundle = Number.isInteger(seatCountNum) && seatCountNum > 1;

  const hasEmptyTier = useTiers && firstUnpricedTier() != null;
  const hasAnyTierFilled =
    useTiers && onSaleTierKeys.some((key) => parseTierAmount(tierAmounts[key]) != null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("請輸入名稱");
      return;
    }
    if (useGroups && !groupKey) {
      setError("請選擇所屬區塊");
      return;
    }

    // 有時段：有販售的每段都要有價，amount 取最後一個販售時段的價格
    // 沒有時段：維持單一金額欄位
    let amountNum: number;
    if (useTiers) {
      if (baseTierKey == null) {
        setError("至少要有一個時段販售這張票");
        return;
      }
      const unpriced = firstUnpricedTier();
      if (unpriced) {
        setError(`請填寫「${unpriced}」的價格`);
        return;
      }
      amountNum = parseTierAmount(tierAmounts[baseTierKey])!;
    } else {
      amountNum = Math.floor(Number(amount));
      if (!Number.isInteger(amountNum) || amountNum < 0) {
        setError("請輸入有效金額（非負整數）");
        return;
      }
    }
    if (!Number.isInteger(seatCountNum) || seatCountNum < 1 || seatCountNum > 10) {
      setError("每張票人數需為 1–10 的整數");
      return;
    }
    const trimmedDescription = description.trim() || null;
    const minFlaggedNum = minFlagged.trim() === "" ? 0 : Number(minFlagged);
    if (!Number.isInteger(minFlaggedNum) || minFlaggedNum < 0 || minFlaggedNum > MAX_MIN_FLAGGED) {
      setError(`至少勾選人數需為 0–${MAX_MIN_FLAGGED} 的整數`);
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
        seatCount: seatCountNum,
        minFlagged: minFlaggedNum,
        description: trimmedDescription,
        prices,
      };
      // 已儲存項目（edit-event 模式）：先打 PATCH 再回傳
      if (existing.id != null && eventId != null) {
        setSubmitting(true);
        try {
          const apiPrices = prices
            .filter((p) => p.tierId != null)
            .map((p) => ({ tierId: p.tierId, amount: p.amount, available: p.available }));
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
                seatCount: seatCountNum,
                minFlagged: minFlaggedNum,
                description: trimmedDescription,
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
          .map((p) => ({ tierId: p.tierId, amount: p.amount, available: p.available }));
        const res = await fetch(`/api/events/${eventId}/purchase-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: trimmedName,
            amount: amountNum,
            sortOrder: currentItems.length,
            groupId: group.groupId ?? null,
            seatCount: seatCountNum,
            minFlagged: minFlaggedNum,
            description: trimmedDescription,
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
          seatCount: seatCountNum,
          minFlagged: minFlaggedNum,
          description: trimmedDescription,
          prices,
        });
        setName("");
        setAmount("");
        setTierAmounts({});
        setOffSaleTiers({});
        setGroupKey("");
        setSeatCount("1");
        setDescription("");
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
        seatCount: seatCountNum,
        minFlagged: minFlaggedNum,
        description: trimmedDescription,
        prices,
      });
      setName("");
      setAmount("");
      setTierAmounts({});
      setOffSaleTiers({});
      setGroupKey("");
      setSeatCount("1");
      setDescription("");
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
        <Label htmlFor="item-seat-count">每張票人數</Label>
        <Input
          id="item-seat-count"
          type="number"
          min={1}
          max={10}
          value={seatCount}
          disabled={seatCountLocked}
          onChange={(e) => setSeatCount(e.target.value)}
          className="w-24"
        />
        <p className="text-xs text-gray-500">
          {seatCountLocked
            ? "已有人報名這張票，無法修改人數。需要不同人數請隱藏後另開新票券。"
            : isBundle
              ? `套票：下方票價是 ${seatCountNum} 人的整組價，不會再乘人數；報名時必須剛好填 ${seatCountNum} 位參加者。`
              : "一般票填 1（票價 × 參加者人數）。雙人票等套票填 2 以上，票價即為整組價。"}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-description">票券說明（選填）</Label>
        <textarea
          id="item-description"
          rows={2}
          placeholder={
            isBundle
              ? "例如：限 2 人同行，其中 1 人須參加伸展台比賽"
              : "例如：含 Workshop 全部 4 堂課"
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-w-0 resize-none rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 md:text-sm"
        />
        <p className="text-xs text-gray-500">會顯示在報名表的票券名稱下方。</p>
      </div>
      {showMinFlagged && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-min-flagged">
            至少幾位參加者勾選「{flagLabel || "參加者勾選項目"}」
          </Label>
          <Input
            id="item-min-flagged"
            type="number"
            min={0}
            max={MAX_MIN_FLAGGED}
            value={minFlagged}
            onChange={(e) => setMinFlagged(e.target.value)}
            className="w-24"
          />
          <p className="text-xs text-gray-500">
            {flagLabel
              ? "0＝不要求。例如 1+1 套票其中一人須參賽就填 1，報名時沒勾到就無法送出。"
              : "活動目前沒有設定參加者勾選項目，此要求不會生效；可改為 0。"}
          </p>
        </div>
      )}
      {useTiers ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{isBundle ? `票價（${seatCountNum} 人整組價）*` : "票價 *"}</Label>
            {hasAnyTierFilled && hasEmptyTier && (
              <button
                type="button"
                onClick={fillEmptyTiersFromFirst}
                className="rounded text-xs font-medium text-brand underline-offset-2 hover:underline"
              >
                其餘時段帶入同價
              </button>
            )}
          </div>
          <p className="-mt-1 text-xs text-gray-500">
            這場活動有 {priceTiers.length} 個票價時段。只在部分時段賣的票（如早鳥限定），
            把其他時段的「販售」取消勾選，報名頁會顯示「已截止」。
          </p>
          {priceTiers.map((tier, index) => {
            const key = tierKey(tier, index);
            const tierLabel = tier.name || `第 ${index + 1} 段`;
            const onSale = isOnSale(key);
            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`w-28 shrink-0 truncate text-sm ${
                    onSale ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {tier.name || "（未命名）"}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder={onSale ? "價格" : "不販售"}
                  value={onSale ? tierAmounts[key] ?? "" : ""}
                  disabled={!onSale}
                  onChange={(e) =>
                    setTierAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  aria-label={`${tierLabel}的價格`}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) =>
                      setOffSaleTiers((prev) => ({ ...prev, [key]: !e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-brand"
                    aria-label={`${tierLabel}販售這張票`}
                  />
                  販售
                </label>
              </div>
            );
          })}
          <p className="text-xs text-gray-500">
            {baseTierName == null
              ? "至少要有一個時段販售這張票。"
              : lastTierOnSale
                ? `「${baseTierName}」是最後一段，會作為這張票的基準價。`
                : `「${baseTierName}」是最後一個販售時段，會作為這張票的基準價；之後的時段報名頁會顯示「已截止」，也不會顯示「省多少」。`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-amount">
            {isBundle ? `金額（${seatCountNum} 人整組價）*` : "金額 *"}
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
