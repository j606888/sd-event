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
  attendees: Array<{ name: string; role: string; flagged?: boolean }>;
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

/** 報名成功但回應沒有報名編號時丟的 Error message（介面另外翻譯） */
export const WALK_IN_MISSING_REGISTRATION_KEY = "MISSING_REGISTRATION_KEY";

/**
 * 失敗時丟出的 Error message 是伺服器回傳的訊息（已依使用者語言翻譯）；
 * 沒有時為空字串，由介面顯示預設文案。
 */
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
    throw new Error(data.error || "");
  }

  if (!data.registration?.registrationKey) {
    throw new Error(WALK_IN_MISSING_REGISTRATION_KEY);
  }

  return data as CreateWalkInResult;
}
