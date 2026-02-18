import type { PublicEventData } from "@/types/event";

export type Participant = {
  id: string;
  name: string;
  role: "Leader" | "Follower" | "Not sure";
};

export type FormData = {
  selectedPlanId: number | null; // For single selection (backward compatibility)
  selectedPlanIds: number[]; // For multiple selection
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  participants: Participant[];
  totalAmount: string;
  paymentMethod: "Line Pay" | "Bank Transfer" | "Other" | null;
};

export const INITIAL_FORM_DATA: FormData = {
  selectedPlanId: null,
  selectedPlanIds: [],
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  participants: [{ id: "1", name: "", role: "Leader" }],
  totalAmount: "",
  paymentMethod: null,
};

export type EventApplicationFormProps = {
  event: PublicEventData;
};
