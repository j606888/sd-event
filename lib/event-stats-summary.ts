/**
 * 統計分頁的衍生數字。
 *
 * 抽成純函式的原因：畫面上每個百分比都可能除以 0（剛開賣的活動一筆報名都沒有），
 * 而 NaN% 在版面上非常醜。這裡統一把分母為 0 收斂成 0，元件端就不必再各自防守。
 */

export type RoleCounts = {
  Leader: number;
  Follower: number;
  "Not sure": number;
};

export type PaymentAmountTotals = {
  confirmed: number;
  reported: number;
  pending: number;
};

/** 各付款狀態的「報名筆數」（付款掛在 registration 上，所以是筆不是人）。 */
export type PaymentCounts = PaymentAmountTotals;

const ROLE_LABELS: Record<keyof RoleCounts, string> = {
  Leader: "Leader",
  Follower: "Follower",
  "Not sure": "尚未確定",
};

// 角色配色沿用品牌 token：Leader 藍／Follower 珊瑚／尚未確定中性灰
const ROLE_COLORS: Record<keyof RoleCounts, string> = {
  Leader: "var(--leader)",
  Follower: "var(--follower)",
  "Not sure": "#b4b4b4",
};

const ROLE_ORDER: (keyof RoleCounts)[] = ["Leader", "Follower", "Not sure"];

export type RoleRow = {
  key: keyof RoleCounts;
  label: string;
  color: string;
  count: number;
  pct: number;
};

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** 角色比例一律以「報名人數」為分母，尚未確定也算在內。 */
export function roleDistribution(roleCounts: RoleCounts): {
  total: number;
  rows: RoleRow[];
} {
  const total = ROLE_ORDER.reduce((sum, key) => sum + roleCounts[key], 0);
  return {
    total,
    rows: ROLE_ORDER.map((key) => ({
      key,
      label: ROLE_LABELS[key],
      color: ROLE_COLORS[key],
      count: roleCounts[key],
      pct: percent(roleCounts[key], total),
    })),
  };
}

/** 入場只看人數：進來幾個、還沒進來幾個。 */
export function checkInSummary(totalAttendees: number, checkedInCount: number) {
  const entered = Math.min(checkedInCount, totalAttendees);
  return {
    entered,
    notEntered: Math.max(totalAttendees - entered, 0),
    pct: percent(entered, totalAttendees),
  };
}

export type PaymentRowKey = "confirmed" | "reported" | "pending";

export type PaymentRow = {
  key: PaymentRowKey;
  label: string;
  color: string;
  amount: number;
  count: number;
  /** 佔「全部付款可收」的比例，用來畫堆疊 bar。 */
  pct: number;
};

const PAYMENT_ROW_META: Record<PaymentRowKey, { label: string; color: string }> = {
  confirmed: { label: "已確認入帳", color: "#00a63e" },
  reported: { label: "已回報・待確認", color: "#fe9a00" },
  pending: { label: "尚未付款", color: "#d1d5dc" },
};

/**
 * 款項三態 + 天花板。
 * expectedTotal（全部付款可收）＝ 已確認 + 待確認 + 應收未收，
 * collectedPct（收款進度）＝ 已確認 / expectedTotal。
 */
export function paymentSummary(
  amounts: PaymentAmountTotals,
  counts: PaymentCounts
) {
  const expectedTotal = amounts.confirmed + amounts.reported + amounts.pending;
  const totalCount = counts.confirmed + counts.reported + counts.pending;

  const rows: PaymentRow[] = (
    ["confirmed", "reported", "pending"] as PaymentRowKey[]
  ).map((key) => ({
    key,
    label: PAYMENT_ROW_META[key].label,
    color: PAYMENT_ROW_META[key].color,
    amount: amounts[key],
    count: counts[key],
    pct: percent(amounts[key], expectedTotal),
  }));

  return {
    rows,
    collected: amounts.confirmed,
    /** 已回報 + 尚未付款：還沒進帳的部分。 */
    outstanding: amounts.reported + amounts.pending,
    expectedTotal,
    totalCount,
    collectedPct: percent(amounts.confirmed, expectedTotal),
  };
}
