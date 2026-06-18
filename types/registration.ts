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
  totalAmount: string;
  paymentMethod: string | null;
};

export type Attendee = {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
};

export type PaymentStatus = "pending" | "reported" | "confirmed" | "rejected";

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
  totalAmount: string;
  attendees: Attendee[];
};

export type EntryVoucherPageData = {
  event: EntryVoucherEventData;
  registration: EntryVoucherRegistrationData;
};

export type PurchaseItem = {
  id: number;
  name: string;
  amount: number;
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
  totalAmount: number;
  paymentStatus: PaymentStatus;
  source?: RegistrationSource | string;
  attendeeCount: number;
  checkedInCount?: number;
  hidden?: boolean;
  createdAt: string;
};

/** Full registration data in detail view */
export type RegistrationDetailData = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentMethod: string | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  source?: RegistrationSource | string;
  paymentScreenshotUrl: string | null;
  paymentNote: string | null;
  hidden?: boolean;
  createdAt: string;
  attendees: Array<{
    id: number;
    name: string;
    role: "Leader" | "Follower" | "Not sure" | string;
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
  totalAmount: number;
  paymentStatus: string;
  purchaseItem: PurchaseItem | null;
  purchaseItems?: PurchaseItem[];
  attendees: Array<{
    id: number;
    name: string;
    role: string;
    checkedIn: boolean;
    checkedInAt: string | null;
  }>;
};
