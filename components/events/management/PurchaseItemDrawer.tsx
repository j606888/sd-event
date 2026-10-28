"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("tickets");
  const tCommon = useTranslations("common");

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
    return index >= 0 ? priceTiers[index].name || t("tierN", { n: index + 1 }) : null;
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
        return tier.name || t("tierN", { n: index + 1 });
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
      setError(t("drawer.nameRequired"));
      return;
    }
    if (useGroups && !groupKey) {
      setError(t("drawer.groupRequired"));
      return;
    }

    // 有時段：有販售的每段都要有價，amount 取最後一個販售時段的價格
    // 沒有時段：維持單一金額欄位
    let amountNum: number;
    if (useTiers) {
      if (baseTierKey == null) {
        setError(t("drawer.noTierOnSale"));
        return;
      }
      const unpriced = firstUnpricedTier();
      if (unpriced) {
        setError(t("drawer.tierPriceRequired", { tier: unpriced }));
        return;
      }
      amountNum = parseTierAmount(tierAmounts[baseTierKey])!;
    } else {
      amountNum = Math.floor(Number(amount));
      if (!Number.isInteger(amountNum) || amountNum < 0) {
        setError(t("drawer.invalidAmount"));
        return;
      }
    }
    if (!Number.isInteger(seatCountNum) || seatCountNum < 1 || seatCountNum > 10) {
      setError(t("drawer.invalidSeatCount"));
      return;
    }
    const trimmedDescription = description.trim() || null;
    const minFlaggedNum = minFlagged.trim() === "" ? 0 : Number(minFlagged);
    if (!Number.isInteger(minFlaggedNum) || minFlaggedNum < 0 || minFlaggedNum > MAX_MIN_FLAGGED) {
      setError(t("drawer.invalidMinFlagged", { max: MAX_MIN_FLAGGED }));
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
            setError(data.error || t("drawer.updateFailed"));
            setSubmitting(false);
            return;
          }
          onUpdated?.(idx, nextDraft);
        } catch {
          setError(t("drawer.updateFailed"));
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
          setError(data.error || t("drawer.createFailed"));
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
        setError(t("drawer.createFailed"));
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
        <Label htmlFor="item-name">{t("drawer.nameLabel")}</Label>
        <Input
          id="item-name"
          placeholder={t("drawer.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {useGroups && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-group">{t("drawer.groupLabel")}</Label>
          <select
            id="item-group"
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
          >
            <option value="">{t("drawer.groupPlaceholder")}</option>
            {groups.map((group, index) => (
              <option key={group.id ?? `draft-${index}`} value={groupKeyOf(group, index)}>
                {group.title || t("untitledGroup")}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-seat-count">{t("drawer.seatCountLabel")}</Label>
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
            ? t("drawer.seatCountLocked")
            : isBundle
              ? t("drawer.seatCountBundle", { count: seatCountNum })
              : t("drawer.seatCountHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-description">{t("drawer.descriptionLabel")}</Label>
        <textarea
          id="item-description"
          rows={2}
          placeholder={
            isBundle
              ? t("drawer.descriptionPlaceholderBundle")
              : t("drawer.descriptionPlaceholder")
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-w-0 resize-none rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 md:text-sm"
        />
        <p className="text-xs text-gray-500">{t("drawer.descriptionHint")}</p>
      </div>
      {showMinFlagged && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-min-flagged">
            {t("drawer.minFlaggedLabel", { label: flagLabel || t("drawer.flagFallback") })}
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
              ? t("drawer.minFlaggedHint")
              : t("drawer.minFlaggedInactive")}
          </p>
        </div>
      )}
      {useTiers ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              {isBundle
                ? t("drawer.priceLabelBundle", { count: seatCountNum })
                : t("drawer.priceLabel")}
            </Label>
            {hasAnyTierFilled && hasEmptyTier && (
              <button
                type="button"
                onClick={fillEmptyTiersFromFirst}
                className="rounded text-xs font-medium text-brand-strong underline-offset-2 hover:underline"
              >
                {t("drawer.fillRest")}
              </button>
            )}
          </div>
          <p className="-mt-1 text-xs text-gray-500">
            {t("drawer.tiersHint", { count: priceTiers.length })}
          </p>
          {priceTiers.map((tier, index) => {
            const key = tierKey(tier, index);
            const tierLabel = tier.name || t("tierN", { n: index + 1 });
            const onSale = isOnSale(key);
            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`w-28 shrink-0 truncate text-sm ${
                    onSale ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {tier.name || t("untitled")}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder={onSale ? t("drawer.pricePlaceholder") : t("drawer.notOnSale")}
                  value={onSale ? tierAmounts[key] ?? "" : ""}
                  disabled={!onSale}
                  onChange={(e) =>
                    setTierAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  aria-label={t("drawer.priceAria", { tier: tierLabel })}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) =>
                      setOffSaleTiers((prev) => ({ ...prev, [key]: !e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-brand"
                    aria-label={t("drawer.onSaleAria", { tier: tierLabel })}
                  />
                  <span>{t("drawer.onSale")}</span>
                </label>
              </div>
            );
          })}
          <p className="text-xs text-gray-500">
            {baseTierName == null
              ? t("drawer.noTierOnSaleHint")
              : lastTierOnSale
                ? t("drawer.baseLast", { tier: baseTierName })
                : t("drawer.baseEarly", { tier: baseTierName })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-amount">
            {isBundle
              ? t("drawer.amountLabelBundle", { count: seatCountNum })
              : t("drawer.amountLabel")}
          </Label>
          <Input
            id="item-amount"
            placeholder={t("drawer.amountPlaceholder")}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button
          type="submit"
          className="bg-primary text-ink hover:bg-brand-hover"
          disabled={submitting}
        >
          {isEditing
            ? submitting
              ? tCommon("saving")
              : tCommon("save")
            : submitting
              ? tCommon("adding")
              : tCommon("add")}
        </Button>
      </div>
    </form>
  );
}
