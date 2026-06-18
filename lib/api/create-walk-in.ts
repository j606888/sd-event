export type CreateWalkInBody = {
  /** 單選（無群組、未開放多選時）使用 */
  purchaseItemId: number | null;
  /** 多選 / 群組活動使用 */
  purchaseItemIds: number[];
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  /** 主辦覆寫金額；留空則由伺服器以當下時段價計算 */
  totalAmount?: number;
  attendees: Array<{ name: string; role: string }>;
  /** 預設 true：建立後立即標記參加者已入場 */
  autoCheckIn?: boolean;
};

export type CreateWalkInResult = {
  registration: {
    id: number;
    registrationKey: string;
    eventId: number;
    contactName: string;
    source: string;
    paymentMethod: string | null;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
  };
};

export async function createWalkInRegistration(
  eventId: number,
  body: CreateWalkInBody
): Promise<CreateWalkInResult> {
  const res = await fetch(`/api/events/${eventId}/registrations/walk-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "現場報名失敗，請稍後再試");
  }

  if (!data.registration?.registrationKey) {
    throw new Error("報名成功，但無法取得報名編號");
  }

  return data as CreateWalkInResult;
}
