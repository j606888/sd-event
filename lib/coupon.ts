/**
 * 折扣碼共用邏輯：正規化與折扣計算。
 *
 * 由報名 route（權威計算）、validate route 與前端預覽共用，
 * 確保 client 顯示的折後金額與 server 實際入帳完全一致。純函式。
 */

export type CouponLike = {
  /** "fixed" = 整筆報名折抵 value 元；"percent" = 折扣 value%（10 = 九折） */
  discountType: "fixed" | "percent";
  value: number;
};

/**
 * 驗證折扣碼欄位（後台 CRUD 用）。回傳錯誤訊息字串，或 null 表通過。
 * value：fixed 為正整數 TWD；percent 為 1–100。usageLimit：null（不限）或 ≥ 1 的整數。
 */
export function validateCouponFields(
  discountType: unknown,
  value: unknown,
  usageLimit: unknown
): string | null {
  if (discountType !== "fixed" && discountType !== "percent") {
    return "折扣類型必須為 fixed 或 percent";
  }
  if (!Number.isInteger(value) || (value as number) < 1) {
    return "折扣數值必須為正整數";
  }
  if (discountType === "percent" && (value as number) > 100) {
    return "折扣百分比必須介於 1–100";
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || (usageLimit as number) < 1)) {
    return "使用上限必須為正整數或不限";
  }
  return null;
}

/** 折扣碼正規化：trim + 大寫。儲存與查詢皆用此結果 → 不分大小寫。 */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * 計算折抵金額（非折後金額）。
 * fixed 整筆折一次並 clamp 到 base；percent 無條件捨去到整數。
 * 回傳值保證 0 <= discount <= base。
 */
export function computeCouponDiscount(base: number, coupon: CouponLike): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const raw =
    coupon.discountType === "fixed"
      ? coupon.value
      : Math.floor((base * coupon.value) / 100);
  return Math.min(Math.max(raw, 0), base);
}
