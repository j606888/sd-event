export type AdminUser = {
  id: number;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  teams: { id: number; name: string; role: string }[];
  eventCount: number;
  registrationCount: number;
};

export type AdminEvent = {
  id: number;
  publicKey: string;
  title: string;
  type: string;
  status: "draft" | "published";
  startAt: string;
  endAt: string;
  createdAt: string;
  teamId: number;
  teamName: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  registrationCount: number;
  revenue: number;
};

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "載入失敗");
  }
  return res.json();
}

export async function getAdminUsers(q?: string): Promise<AdminUser[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await get<{ users: AdminUser[] }>(`/api/admin/users${query}`);
  return data.users;
}

export async function getAdminEvents(params?: {
  userId?: number;
  teamId?: number;
}): Promise<AdminEvent[]> {
  const search = new URLSearchParams();
  if (params?.userId) search.set("userId", String(params.userId));
  if (params?.teamId) search.set("teamId", String(params.teamId));
  const query = search.toString() ? `?${search}` : "";
  const data = await get<{ events: AdminEvent[] }>(`/api/admin/events${query}`);
  return data.events;
}

export async function getAdminEventDetail(eventId: number) {
  return get<AdminEventDetail>(`/api/admin/events/${eventId}`);
}

export type AdminEventDetail = {
  event: {
    id: number;
    publicKey: string;
    title: string;
    type: string;
    status: "draft" | "published";
    description: string | null;
    startAt: string;
    endAt: string;
  };
  meta: {
    teamName: string;
    owner: { id: number; name: string; email: string };
    locationName: string | null;
    organizerName: string | null;
  };
  groups: { id: number; title: string; selectionMode: string; required: boolean }[];
  items: { id: number; groupId: number | null; name: string; amount: number; hidden: boolean }[];
  tiers: { id: number; name: string; endsAt: string | null }[];
  stats: {
    registrationCount: number;
    attendeeCount: number;
    checkedInCount: number;
    leaderCount: number;
    followerCount: number;
    notSureCount: number;
    revenue: number;
    confirmedRevenue: number;
  };
  registrations: {
    id: number;
    registrationKey: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    source: string;
    paymentMethod: string | null;
    paymentStatus: string;
    totalAmount: number;
    discountAmount: number;
    couponCode: string | null;
    hidden: boolean;
    createdAt: string;
    attendees: { id: number; name: string; role: string; checkedIn: boolean }[];
    purchaseItems: { id: number; name: string; quantity: number }[];
  }[];
};

export async function impersonateUser(userId: number): Promise<void> {
  const res = await fetch("/api/admin/impersonate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "無法模擬此使用者");
  }
}
