"use client";

import { useTranslations } from "next-intl";
import { unavailableSaleStatus } from "@/lib/pricing";

type TicketPriceLineProps = {
  /** 當下生效時段的價格 */
  amount: number;
  /** 最後一段（一般／現場）的價格，即原價；等於或小於 amount 時不顯示省錢資訊 */
  fullAmount?: number;
  /** 原價所屬時段名稱，作為刪除線價格的說明文字 */
  fullTierName?: string | null;
  /** intro＝方案介紹（19px）；picker＝票券選項卡片內（18px，稍密） */
  variant: "intro" | "picker";
  /** 套票人數（>1 時在價格後標示「/ N 人」，表示整組價） */
  seatCount?: number;
  /** 目前時段不販售（如早鳥限定已截止）時的狀態文字；有值時價格變灰並以此取代省錢資訊 */
  unavailableLabel?: string | null;
};

/** 現在報名比原價省下的金額；沒有可省的（無時段／已是最後一段／不漲價）回傳 null */
export function getTicketSavings(
  amount: number,
  fullAmount?: number
): number | null {
  if (fullAmount == null) return null;
  const diff = fullAmount - amount;
  return diff > 0 ? diff : null;
}

/**
 * 不可購買票券的狀態文字（給 TicketPriceLine 的 unavailableLabel）；可購買回傳 null。
 * 方案介紹與票券選擇共用，確保兩處用字一致。
 */
export function useSaleStatusLabel() {
  const t = useTranslations("publicEvent.saleStatus");
  return (item: { saleStatus?: string | null; opensTierName?: string | null }): string | null => {
    const sale = unavailableSaleStatus(item);
    if (!sale) return null;
    if (sale.status === "ended") return t("ended");
    return sale.opensTierName ? t("opensAt", { tier: sale.opensTierName }) : t("upcoming");
  };
}

/**
 * 票券價格的「右軌」（純 presentational）：現價獨佔一行放大，
 * 原價與省額退到下一行小字，整組靠右 —— 右緣成一直線，一眼比得出價差。
 * 公開報名頁的「方案介紹」與「票券選項」、以及後台「報名頁即時預覽」共用。
 */
export function TicketPriceLine({
  amount,
  fullAmount,
  fullTierName,
  variant,
  seatCount,
  unavailableLabel,
}: TicketPriceLineProps) {
  const t = useTranslations("publicEvent.priceLine");
  const savings = unavailableLabel ? null : getTicketSavings(amount, fullAmount);
  // 金額以字串傳入：數字參數會被 ICU 加上千分位，跟頁面其他的 $1200 寫法不一致
  const originalLabel = fullTierName
    ? t("tierPrice", { tier: fullTierName, amount: String(fullAmount) })
    : t("originalPrice", { amount: String(fullAmount) });

  return (
    <div className="flex shrink-0 flex-col items-end gap-px">
      <span
        className={`font-display font-semibold leading-tight tabular-nums ${
          variant === "intro" ? "text-[19px]" : "text-[18px]"
        } ${unavailableLabel ? "text-gray-400 line-through" : "text-ink"}`}
      >
        <span>{`$${amount}`}</span>
        {seatCount != null && seatCount > 1 && (
          <span className="ml-0.5 text-xs font-normal text-gray-500">
            {t("perSeats", { count: seatCount })}
          </span>
        )}
      </span>
      {unavailableLabel && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
          {unavailableLabel}
        </span>
      )}
      {savings != null && (
        <span className="text-xs text-gray-400 tabular-nums">
          <span className="line-through" title={originalLabel}>
            {`$${fullAmount}`}
          </span>
          <span aria-hidden> · </span>
          <span className="font-semibold text-butter-ink">
            {t("savings", { amount: String(savings) })}
          </span>
        </span>
      )}
    </div>
  );
}
