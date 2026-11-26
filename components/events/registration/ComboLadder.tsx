"use client";

import { useTranslations } from "next-intl";
import { comboFor, comboLadder } from "@/lib/combo-pricing";
import type { EventGroupCombo, EventPurchaseItemGroup } from "@/types/event";

/** 價目表某一列的顯示名稱：有自訂名稱用名稱，否則「N 項」 */
function useComboLabel() {
  const t = useTranslations("publicEvent.ticketPicker");
  return (row: EventGroupCombo) => row.title || t("comboCount", { count: row.count });
}

/**
 * 組合價區塊的價目階梯（「1 項 $500｜2 項 $900｜Full Pass $1200」）。
 * 方案介紹、報名表、後台預覽共用；`activeCount` 標出目前勾到哪一格。
 */
export function ComboLadder({
  group,
  activeCount,
  giftName,
}: {
  group: Pick<EventPurchaseItemGroup, "id" | "comboPricing" | "combos">;
  /** 目前勾選數量（報名表用）；未帶 = 不標示 */
  activeCount?: number;
  /** 附贈票名稱查詢 */
  giftName: (itemId: number) => string | null;
}) {
  const t = useTranslations("publicEvent.ticketPicker");
  const labelOf = useComboLabel();
  const rows = comboLadder(group);
  if (rows.length === 0) return null;
  const giftRows = rows.filter((r) => r.giftItemId != null && giftName(r.giftItemId));

  return (
    <div className="space-y-1.5">
      <ul
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(rows.length, 4)}, minmax(0, 1fr))` }}
      >
        {rows.map((row) => {
          const active = activeCount === row.count;
          return (
            <li
              key={row.count}
              aria-current={active ? "true" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-2 text-center ${
                active ? "bg-brand-strong text-white" : "bg-gray-100 text-ink"
              }`}
            >
              <span className="text-xs leading-tight">{labelOf(row)}</span>
              <span className="text-[15px] font-bold">
                {t("comboPrice", { amount: String(row.amount) })}
              </span>
            </li>
          );
        })}
      </ul>
      {giftRows.map((row) => (
        <p key={row.count} className="text-xs text-gray-500">
          {labelOf(row)}・{t("comboIncludesGift", { gift: giftName(row.giftItemId!)! })}
        </p>
      ))}
    </div>
  );
}

/**
 * 報名表勾選時的即時提示：已選幾項、省多少、再加一項要多少（與是否升級成具名組合／附贈）。
 */
export function ComboHint({
  group,
  count,
  giftName,
}: {
  group: Pick<EventPurchaseItemGroup, "id" | "comboPricing" | "combos">;
  count: number;
  giftName: (itemId: number) => string | null;
}) {
  const t = useTranslations("publicEvent.ticketPicker");
  const current = comboFor(group, count);
  const next = comboFor(group, count + 1);
  const single = comboFor(group, 1);

  let headline: string;
  if (count === 0 || !current) {
    headline = t("comboEmpty");
  } else {
    headline = current.title
      ? t("comboSelectedTitled", { title: current.title, amount: String(current.amount) })
      : t("comboSelected", { count, amount: String(current.amount) });
    const saved = single ? single.amount * count - current.amount : 0;
    if (saved > 0) headline += t("comboSaved", { amount: String(saved) });
  }

  let detail: string | null = null;
  if (count > 0 && current && next) {
    const diff = String(Math.max(next.amount - current.amount, 0));
    detail = next.title
      ? t("comboNextTitled", { title: next.title, amount: diff })
      : t("comboNext", { amount: diff });
    const gift = next.giftItemId != null ? giftName(next.giftItemId) : null;
    if (gift) detail += t("comboNextGift", { gift });
  } else if (current?.giftItemId != null) {
    const gift = giftName(current.giftItemId);
    if (gift) detail = t("comboIncludesGift", { gift });
  }

  const reachedTop = current != null && next == null && count > 0;
  return (
    <div
      aria-live="polite"
      className={`flex flex-col gap-0.5 rounded-lg px-3 py-2.5 ${
        reachedTop ? "bg-butter-soft text-butter-ink" : "bg-paper text-brand-strong"
      }`}
    >
      <span className="text-sm font-semibold">{headline}</span>
      {detail && <span className="text-xs">{detail}</span>}
    </div>
  );
}
