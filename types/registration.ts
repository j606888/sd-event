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
