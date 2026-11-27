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
  // 只有一列：不畫階梯（價格改由票券列右側顯示，見 ComboSinglePrice）
  if (rows.length <= 1) return null;
  const giftIds = rows.map((r) => (r.giftItemId != null ? giftName(r.giftItemId) : null));
  const allSameGift = giftIds[0] != null && giftIds.every((g) => g === giftIds[0]);
  const giftRows = allSameGift ? [] : rows.filter((r) => r.giftItemId != null && giftName(r.giftItemId));

  return (
    <div className="space-y-0.5">
      <ul className="flex flex-wrap items-center gap-x-1.5 text-sm text-gray-600 tabular-nums">
        {rows.map((row, i) => {
          const active = activeCount === row.count;
          return (
            <li
              key={row.count}
              aria-current={active ? "true" : undefined}
              className="flex items-center gap-1.5"
            >
              {i > 0 && <span aria-hidden>・</span>}
              <span className={active ? "font-bold text-ink underline underline-offset-2" : undefined}>
                {labelOf(row)} {t("comboPrice", { amount: String(row.amount) })}
              </span>
            </li>
          );
        })}
      </ul>
      {allSameGift && (
        <p className="text-xs text-gray-500">{t("comboAllIncludeGift", { gift: giftIds[0]! })}</p>
      )}
      {giftRows.map((row) => (
        <p key={row.count} className="text-xs text-gray-500">
          {labelOf(row)}・{t("comboIncludesGift", { gift: giftName(row.giftItemId!)! })}
        </p>
      ))}
    </div>
  );
}

/**
 * 組合價區塊只有一列（單張票）時，價格直接放在票券列右側，旁邊小標附贈票。
 * 非單列時回傳 null（由 ComboLadder 負責）。
 */
export function ComboSinglePrice({
  group,
  giftName,
  compact = false,
}: {
  group: Pick<EventPurchaseItemGroup, "id" | "comboPricing" | "combos">;
  giftName: (itemId: number) => string | null;
  /** 現場報名抽屜等密集版面：價格用內文字級；預設與 TicketPriceLine 的現價同級 */
  compact?: boolean;
}) {
  const t = useTranslations("publicEvent.ticketPicker");
  const rows = comboLadder(group);
  if (rows.length !== 1) return null;
  const row = rows[0];
  const gift = row.giftItemId != null ? giftName(row.giftItemId) : null;
  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5">
      <span
        className={
          compact
            ? "text-sm text-gray-600 tabular-nums"
            : "font-display text-[18px] font-semibold leading-tight text-ink tabular-nums"
        }
      >
        {t("comboPrice", { amount: String(row.amount) })}
      </span>
      {gift && (
        <span className="rounded bg-butter-soft px-1.5 py-0.5 text-xs font-medium text-butter-ink">
          {t("comboGiftTag", { gift })}
        </span>
      )}
    </span>
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
