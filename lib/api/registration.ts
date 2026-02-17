import type {
  EventLocation,
  EventOrganizer,
  EventBankInfo,
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
  };
  purchaseItem: EventPurchaseItem | null;
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
    throw new Error("無法載入報名資料");
  }

  const data = await res.json();
  return data ?? null;
}
