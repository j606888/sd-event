"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  GroupComboDraft,
  PriceTierDraft,
  PurchaseItemDraft,
  PurchaseItemGroupDraft,
} from "@/hooks/use-event-form";

type RowState = {
  count: number;
  title: string;
  /** 無時段時的總價 */
  amount: string;
  /** 各時段總價，key = tierId */
  prices: Record<number, string>;
  giftItemId: string;
};

const isMoney = (v: string) => /^\d+$/.test(v.trim());

function initialRows(
  group: PurchaseItemGroupDraft,
  itemCount: number,
  tierIds: number[]
): RowState[] {
  return Array.from({ length: itemCount }, (_, i) => {
    const count = i + 1;
    const saved = group.combos?.find((c) => c.count === count);
    const prices: Record<number, string> = {};
    for (const tierId of tierIds) {
      const p = saved?.prices.find((x) => x.tierId === tierId);
      prices[tierId] = p ? String(p.amount) : saved && tierIds.at(-1) === tierId ? String(saved.amount) : "";
    }
    return {
      count,
      title: saved?.title ?? "",
      amount: saved ? String(saved.amount) : "",
      prices,
      giftItemId: saved?.giftItemId != null ? String(saved.giftItemId) : "",
    };
  });
}

/**
 * 可複選票券區塊的「組合價」設定：開關 + 「選 N 項 = 多少錢」價目表（每個時段各一欄）
 * + 每列的顯示名稱與附贈票。計價規則見 lib/combo-pricing.ts。
 */
export function ComboPricingPanel({
  group,
  groupItems,
  priceTiers,
  giftCandidates,
  canEdit,
  onSave,
}: {
  group: PurchaseItemGroupDraft;
  /** 本區塊在報名表上看得到的票（未隱藏） */
  groupItems: PurchaseItemDraft[];
  priceTiers: PriceTierDraft[];
  /** 可當附贈的票：其他區塊、已儲存、未隱藏 */
  giftCandidates: { id: number; name: string }[];
  canEdit: boolean;
  onSave: (payload: { comboPricing: boolean; combos: GroupComboDraft[] }) => Promise<string | null>;
}) {
  const t = useTranslations("tickets.groups.combo");
  const tiers = useMemo(
    () => priceTiers.filter((tier): tier is PriceTierDraft & { id: number } => tier.id != null),
    [priceTiers]
  );
  const tierIds = useMemo(() => tiers.map((tier) => tier.id), [tiers]);
  const itemCount = groupItems.length;

  const [open, setOpen] = useState(Boolean(group.comboPricing));
  const [rows, setRows] = useState<RowState[]>(() => initialRows(group, itemCount, tierIds));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // 已儲存的設定或票數變動時，重新帶入表格
  useEffect(() => {
    setRows(initialRows(group, itemCount, tierIds));
    setOpen(Boolean(group.comboPricing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.combos, group.comboPricing, itemCount, tierIds.join(",")]);

  const updateRow = (count: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.count === count ? { ...r, ...patch } : r)));
    setSavedFlash(false);
  };

  const disabled = !canEdit || itemCount === 0;

  const handleToggle = async () => {
    if (disabled) return;
    setError(null);
    if (!open) {
      setOpen(true);
      return;
    }
    // 關閉：已啟用的要存回後端；只是展開還沒存的直接收起
    if (group.comboPricing) {
      setSaving(true);
      const err = await onSave({ comboPricing: false, combos: [] });
      setSaving(false);
      if (err) {
        setError(err);
        return;
      }
    }
    setOpen(false);
  };

  const handleSave = async () => {
    const complete = rows.every((r) =>
      tiers.length > 0 ? tierIds.every((id) => isMoney(r.prices[id] ?? "")) : isMoney(r.amount)
    );
    if (!complete) {
      setError(t("missingPrice"));
      return;
    }
    const combos: GroupComboDraft[] = rows.map((r) => {
      const prices = tiers.map((tier) => ({ tierId: tier.id, amount: Number(r.prices[tier.id]) }));
      return {
        count: r.count,
        title: r.title.trim() || null,
        amount: tiers.length > 0 ? prices.at(-1)!.amount : Number(r.amount),
        giftItemId: r.giftItemId ? Number(r.giftItemId) : null,
        prices,
      };
    });
    setError(null);
    setSaving(true);
    const err = await onSave({ comboPricing: true, combos });
    setSaving(false);
    if (err) setError(err);
    else setSavedFlash(true);
  };

  const priceColumns = tiers.length > 0 ? tiers.map((tier) => ({ id: tier.id, name: tier.name })) : [null];

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-brand-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink">{t("title")}</span>
          <span className="text-xs leading-relaxed text-muted-ink">{t("description")}</span>
          {!canEdit && <span className="text-xs text-muted-ink">{t("needsSavedEvent")}</span>}
          {canEdit && itemCount === 0 && (
            <span className="text-xs text-muted-ink">{t("needsItems")}</span>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label={t("toggleAria")}
          disabled={disabled || saving}
          onClick={handleToggle}
          className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            open ? "justify-end bg-brand-strong" : "justify-start bg-gray-300"
          }`}
        >
          <span className="block size-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {open && !disabled && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const isAll = row.count === itemCount && itemCount > 1;
              const label = isAll
                ? t("rowLabelAll", { count: row.count })
                : t("rowLabel", { count: row.count });
              return (
                <li
                  key={row.count}
                  className="flex flex-col gap-2 rounded-md bg-white p-3 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-3"
                >
                  <span className="pt-2 text-sm font-semibold text-ink">{label}</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {priceColumns.map((col) => {
                        const value = col ? row.prices[col.id] ?? "" : row.amount;
                        const inputId = `combo-${group.id}-${row.count}-${col?.id ?? "amount"}`;
                        const avg =
                          isMoney(value) && row.count > 1
                            ? Math.round(Number(value) / row.count)
                            : null;
                        return (
                          <div key={col?.id ?? "amount"} className="flex w-32 flex-col gap-1">
                            <label htmlFor={inputId} className="text-xs text-muted-ink">
                              {col ? t("tierPriceLabel", { tier: col.name }) : t("priceLabel")}
                            </label>
                            <Input
                              id={inputId}
                              inputMode="numeric"
                              placeholder="$"
                              value={value}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^\d]/g, "");
                                if (col) updateRow(row.count, { prices: { ...row.prices, [col.id]: v } });
                                else updateRow(row.count, { amount: v });
                              }}
                            />
                            {avg != null && (
                              <span className="text-[11px] text-muted-ink">
                                {t("avg", { amount: String(avg) })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                        <label
                          htmlFor={`combo-${group.id}-${row.count}-title`}
                          className="text-xs text-muted-ink"
                        >
                          {t("nameLabel")}
                        </label>
                        <Input
                          id={`combo-${group.id}-${row.count}-title`}
                          placeholder={t("namePlaceholder")}
                          value={row.title}
                          onChange={(e) => updateRow(row.count, { title: e.target.value })}
                        />
                      </div>
                      {giftCandidates.length > 0 && (
                        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                          <label
                            htmlFor={`combo-${group.id}-${row.count}-gift`}
                            className="text-xs text-muted-ink"
                          >
                            {t("giftLabel")}
                          </label>
                          <select
                            id={`combo-${group.id}-${row.count}-gift`}
                            className="h-9 rounded-md border-0 bg-field px-2 text-sm text-ink"
                            value={row.giftItemId}
                            onChange={(e) => updateRow(row.count, { giftItemId: e.target.value })}
                          >
                            <option value="">{t("giftNone")}</option>
                            {giftCandidates.map((item) => (
                              <option key={item.id} value={String(item.id)}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs leading-relaxed text-muted-ink">{t("hint")}</p>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
            {savedFlash && <span className="text-xs text-brand-strong">{t("saved")}</span>}
          </div>
        </div>
      )}
      {error && (!open || disabled) && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
