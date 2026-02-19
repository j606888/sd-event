export type CreateRegistrationBody = {
  purchaseItemId: number | null; // For single selection (backward compatibility)
  purchaseItemIds: number[]; // For multiple selection
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentMethod: string;
  totalAmount: number;
  attendees: Array<{ name: string; role: string }>;
};

export type CreateRegistrationResult = {
  registration: {
    id: number;
    registrationKey: string;
    eventId: number;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    paymentMethod: string | null;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
  };
};

export async function createRegistration(
  eventId: number,
  body: CreateRegistrationBody
): Promise<CreateRegistrationResult> {
  const res = await fetch(`/api/events/${eventId}/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "報名失敗，請稍後再試");
  }

  if (!data.registration?.registrationKey) {
    throw new Error("報名成功，但無法取得報名編號");
  }

  return data as CreateRegistrationResult;
}
