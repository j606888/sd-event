"use client";

type TicketPriceLineProps = {
  /** 當下生效時段的價格 */
  amount: number;
  /** 最後一段（一般／現場）的價格，即原價；等於或小於 amount 時不顯示省錢資訊 */
  fullAmount?: number;
  /** 原價所屬時段名稱，作為刪除線價格的說明文字 */
  fullTierName?: string | null;
  /** intro＝方案介紹（19px）；picker＝票券選項卡片內（18px，稍密） */
  variant: "intro" | "picker";
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
 * 票券價格的「右軌」（純 presentational）：現價獨佔一行放大，
 * 原價與省額退到下一行小字，整組靠右 —— 右緣成一直線，一眼比得出價差。
 * 公開報名頁的「方案介紹」與「票券選項」、以及後台「報名頁即時預覽」共用。
 */
export function TicketPriceLine({
  amount,
  fullAmount,
  fullTierName,
  variant,
}: TicketPriceLineProps) {
  const savings = getTicketSavings(amount, fullAmount);
  const originalLabel = `${fullTierName ? `${fullTierName}價` : "原價"} $${fullAmount}`;

  return (
    <div className="flex shrink-0 flex-col items-end gap-px">
      <span
        className={`font-display font-semibold leading-tight text-ink tabular-nums ${
          variant === "intro" ? "text-[19px]" : "text-[18px]"
        }`}
      >
        ${amount}
      </span>
      {savings != null && (
        <span className="text-xs text-gray-400 tabular-nums">
          <span className="line-through" title={originalLabel}>
            ${fullAmount}
          </span>
          <span aria-hidden> · </span>
          <span className="font-semibold text-follower">省 ${savings}</span>
        </span>
      )}
    </div>
  );
}
