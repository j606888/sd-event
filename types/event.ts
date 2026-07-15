/**
 * Shared event-related types for public event pages and forms.
 * Reused across app/e/[publicKey], EventApplicationForm, RegistrationSuccessPage, etc.
 */

export type EventLocation = {
  id: number;
  name: string;
  address: string | null;
  googleMapUrl: string | null;
};

export type EventOrganizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
};

export type EventBankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

export type EventPurchaseItem = {
  id: number;
  name: string;
  /** 當下生效時段的有效價（由公開 API 依伺服器時間解析後填入） */
  amount: number;
  /** 所屬票種群組；null/undefined = 此活動未使用群組 */
  groupId?: number | null;
};

export type EventPurchaseItemGroup = {
  id: number;
  title: string;
  selectionMode: "single" | "multiple";
  required: boolean;
  sortOrder: number;
  items: EventPurchaseItem[];
  /** 與此群組互斥的群組 id（對稱、雙向展開）；選了任一方即鎖住另一方 */
  excludesGroupIds?: number[];
};

export type EventNoticeItem = {
  id: number;
  content: string;
};

/** Event as returned by public API (e.g. /api/events/public/:publicKey) and used by application form */
export type PublicEventData = {
  id: number;
  publicKey?: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  status: string;
  allowMultiplePurchase: boolean;
  autoCalcAmount: boolean;
  /** 當下生效的票價時段（無時段時為 null），purchaseItems[].amount 已依此解析 */
  /** 目前生效的票價時段；endsAt 為 null 表示不過期（一般／現場價） */
  activeTier: { name: string; endsAt: string | null } | null;
  location: EventLocation | null;
  organizer: EventOrganizer | null;
  bankInfo: EventBankInfo | null;
  purchaseItems: EventPurchaseItem[];
  /** 票種群組（含其下項目）；空陣列 = 此活動未使用群組，走舊模型 */
  groups: EventPurchaseItemGroup[];
  noticeItems: EventNoticeItem[];
  /** 活動是否設有折扣碼（報名表據此顯示折扣碼輸入欄位） */
  hasCoupons?: boolean;
};

/** 已套用的折扣碼（validate API 回傳、報名表單預覽用） */
export type AppliedCoupon = {
  code: string;
  discountType: "fixed" | "percent";
  value: number;
};
