import type {
  EventLocation,
  EventOrganizer,
  EventBankInfo,
  EventLinePayee,
  EventPurchaseItem,
} from "@/types/event";

export type RegistrationApiResponse = {
  registration: {
    id: number;
    registrationKey: string;
    eventId: number;
    purchaseItemId: number | null;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    paymentMethod: string | null;
    totalAmount: number;
    couponCode: string | null;
    discountAmount: number;
    paymentStatus: string;
    paymentScreenshotUrl: string | null;
    paymentNote: string | null;
    createdAt: string;
    updatedAt: string;
  };
  event: {
    id: number;
    title: string;
    description: string | null;
    coverUrl: string | null;
    startAt: string;
    endAt: string;
    location: EventLocation | null;
    organizer: EventOrganizer | null;
    bankInfo: EventBankInfo | null;
    linePayee: EventLinePayee | null;
  };
  purchaseItem: EventPurchaseItem | null; // For backward compatibility
  purchaseItems: EventPurchaseItem[]; // Array of purchase items (for multiple selection)
  attendees: Array<{
    id: number;
    name: string;
    role: string;
    checkedIn: boolean;
    checkedInAt: string | null;
  }>;
};

/**
 * 依註冊金鑰取得報名資料（不需登入）
 * @returns 報名資料，404 時回傳 null，其他錯誤 throw
 * （message 為伺服器回傳的 error；沒有時為空字串，由畫面顯示翻譯後的預設訊息）
 */
export async function getRegistrationByKey(
  registrationKey: string
): Promise<RegistrationApiResponse | null> {
  const res = await fetch(
    `/api/registrations/${encodeURIComponent(registrationKey)}`
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "");
  }

  const data = await res.json();
  return data ?? null;
}
