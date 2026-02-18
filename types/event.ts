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
  amount: number;
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
  location: EventLocation | null;
  organizer: EventOrganizer | null;
  bankInfo: EventBankInfo | null;
  purchaseItems: EventPurchaseItem[];
  noticeItems: EventNoticeItem[];
};
