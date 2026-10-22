import type {
  EventLocation,
  EventOrganizer,
  EventPurchaseItem,
} from "./event";

/**
 * Registration success page specific types
 */

export type RegistrationSuccessEventData = {
  id: number;
  title: string;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  location: EventLocation | null;
  organizer: EventOrganizer | null;
  purchaseItems: EventPurchaseItem[];
};

export type RegistrationSuccessRegistrationData = {
  selectedPlan: EventPurchaseItem | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  participants: Array<{ name: string; role: string }>;
  /** 實付金額（已折扣） */
  totalAmount: string;
  couponCode?: string | null;
  discountAmount?: number;
  paymentMethod: string | null;
};

export type Attendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
};

export type PaymentStatus = "pending" | "reported" | "confirmed" | "rejected" | "refunded";

export type RegistrationSuccessPageProps = {
  event: RegistrationSuccessEventData;
  registration: RegistrationSuccessRegistrationData;
  registrationKey: string;
  paymentStatus: PaymentStatus;
};

export type RegistrationSuccessPageRouteData = {
  event: RegistrationSuccessEventData;
  registration: RegistrationSuccessRegistrationData & {
    attendees: Attendee[];
    paymentStatus?: string;
  };
  paymentStatus: PaymentStatus;
};

/**
 * Entry voucher page specific types
 */
export type EntryVoucherEventData = {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  location: EventLocation | null;
};

export type EntryVoucherRegistrationData = {
  selectedPlan: EventPurchaseItem | null;
  /** 實付金額（已折扣） */
  totalAmount: string;
  couponCode?: string | null;
  discountAmount?: number;
  attendees: Attendee[];
};

export type EntryVoucherPageData = {
  event: EntryVoucherEventData;
  registration: EntryVoucherRegistrationData;
};

export type PurchaseItem = {
  id: number;
  name: string;
  /**
   * 報名當下的成交單價（含時段）；舊資料無快照時為項目定價。
   * 驗票人員（staff）看不到金額，伺服器會剝除此欄位。
   */
  amount?: number;
  /** 報名當下生效的時段名稱（如「早鳥」）；無時段或舊資料為 null */
  tierName?: string | null;
};

/** 報名來源："online"（公開表單）| "walk_in"（現場由主辦建立） */
export type RegistrationSource = "online" | "walk_in";

/** Registration row in list view */
export type Registration = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  /** 驗票人員（staff）看不到金額，伺服器會剝除此欄位 */
  totalAmount?: number;
  couponCode?: string | null;
  paymentStatus: PaymentStatus;
  source?: RegistrationSource | string;
  attendeeCount: number;
  checkedInCount?: number;
  /** 名單列直接顯示姓名／角色，並用來不進明細就入場 */
  attendees: RegistrationListAttendee[];
  /** 報名項目摘要（例：「Full Pass × 2、Party」），不含金額 */
  itemSummary: string;
  hidden?: boolean;
  createdAt: string;
};

export type RegistrationListAttendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
  checkedInAt: string | null;
};

/** Full registration data in detail view */
export type RegistrationDetailData = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentMethod: string | null;
  /**
   * 實付金額（已折扣）；原價 = totalAmount + discountAmount。
   * 驗票人員（staff）看不到金額，伺服器會剝除此欄位。
   */
  totalAmount?: number;
  couponCode?: string | null;
  discountAmount?: number;
  paymentStatus: PaymentStatus;
  source?: RegistrationSource | string;
  paymentScreenshotUrl?: string | null;
  paymentNote: string | null;
  /** 退款紀錄（paymentStatus = "refunded" 時才有值）；方式、備註、處理人驗票人員看不到 */
  refundedAt?: string | null;
  refundMethod?: string | null;
  refundNote?: string | null;
  refundedByName?: string | null;
  hidden?: boolean;
  createdAt: string;
  /** 活動的參加者勾選項目名稱；null = 未使用 */
  attendeeFlagLabel?: string | null;
  attendees: Array<{
    id: number;
    name: string;
    role: "Leader" | "Follower" | "Not sure" | string;
    flagged?: boolean;
    checkedIn?: boolean;
    checkedInAt?: string | null;
  }>;
  purchaseItem: PurchaseItem | null;
  purchaseItems?: PurchaseItem[];
};

/** Registration as shown in the QR scan check-in view */
export type ScannedRegistration = {
  id: number;
  registrationKey: string;
  contactName: string;
  totalAmount?: number;
  paymentStatus: string;
  purchaseItem: PurchaseItem | null;
  purchaseItems?: PurchaseItem[];
  /** 活動的參加者勾選項目名稱；null = 未使用 */
  attendeeFlagLabel?: string | null;
  attendees: Array<{
    id: number;
    name: string;
    role: string;
    flagged?: boolean;
    checkedIn: boolean;
    checkedInAt: string | null;
  }>;
};
