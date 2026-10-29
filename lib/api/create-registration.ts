export type CreateRegistrationBody = {
  purchaseItemId: number | null; // For single selection (backward compatibility)
  purchaseItemIds: number[]; // For multiple selection
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentMethod: string;
  totalAmount: number;
  /** 折扣碼（伺服器會重新驗證與計算折扣）；null = 未使用 */
  couponCode: string | null;
  attendees: Array<{ name: string; role: string; flagged?: boolean }>;
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
    couponCode: string | null;
    discountAmount: number;
    paymentStatus: string;
    createdAt: string;
  };
};

/** 報名成功但回應沒有報名編號時的錯誤代碼（本檔自訂，介面另外翻譯） */
export const MISSING_REGISTRATION_KEY = "MISSING_REGISTRATION_KEY";

/**
 * 報名失敗。message 為伺服器回傳的訊息（已依使用者語言翻譯）；沒有時為空字串，由介面顯示預設文案。
 * code 為伺服器回傳的錯誤代碼（如 COUPON_EXHAUSTED），或本檔的 MISSING_REGISTRATION_KEY。
 */
export class CreateRegistrationError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "CreateRegistrationError";
    this.code = code;
  }
}

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
    throw new CreateRegistrationError(
      data.error || "",
      typeof data.code === "string" ? data.code : null
    );
  }

  if (!data.registration?.registrationKey) {
    throw new CreateRegistrationError("", MISSING_REGISTRATION_KEY);
  }

  return data as CreateRegistrationResult;
}
