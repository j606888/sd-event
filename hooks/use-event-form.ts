"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUploadThing } from "@/lib/uploadthing";

export type DrawerType =
  | null
  | "location"
  | "purchaseItem"
  | "notice"
  | "organizer"
  | "bank";

/** 項目於某時段的價格；create 模式 tier 尚無 id，用 tierDraftIndex 暫referer */
export type ItemTierPriceDraft = {
  tierId?: number;
  tierDraftIndex?: number;
  amount: number;
};

export type PurchaseItemDraft = {
  id?: number;
  name: string;
  amount: number;
  /** 不在公開報名表顯示（已儲存項目由後端同步；新建項目僅存於表單狀態） */
  hidden?: boolean;
  /** 各時段價（可空 = 全部用 amount fallback） */
  prices?: ItemTierPriceDraft[];
  /** 已綁定的未隱藏報名數（已儲存項目由後端帶入）；0 或未定義＝可刪除 */
  soldCount?: number;
  /** 所屬票種群組（已儲存群組）；null = 未分組 */
  groupId?: number | null;
  /** create 模式群組尚無 id 時，暫referer 草稿群組 index */
  groupDraftIndex?: number;
};

/** 票種群組草稿 */
export type PurchaseItemGroupDraft = {
  id?: number;
  title: string;
  selectionMode: "single" | "multiple";
  required: boolean;
  sortOrder: number;
};

/** 票價時段草稿；endsAt 為 "YYYY-MM-DD"（空 = fallback 段，永不過期） */
export type PriceTierDraft = {
  id?: number;
  name: string;
  endsAt: string;
  sortOrder: number;
};

export type NoticeItemDraft = { id?: number; content: string };

/** ISO 時間轉成 date input 的 "YYYY-MM-DD"（當地） */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type EventFormInitialData = {
  id: number;
  teamId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  locationId: number | null;
  organizerId: number | null;
  bankInfoId: number | null;
  allowMultiplePurchase: boolean;
  autoCalcAmount: boolean;
};

type Location = { id: number; name: string };
type Organizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
};
type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

function toDateTimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function datetimeLocalToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return new Date().toISOString();
  const localDate = new Date(datetimeLocal);
  if (isNaN(localDate.getTime())) {
    return new Date().toISOString();
  }
  return localDate.toISOString();
}

type UseEventFormParams = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: EventFormInitialData;
  onSaveSuccess?: () => void;
};

export function useEventForm({
  mode,
  teamId,
  eventId,
  initialData,
  onSaveSuccess,
}: UseEventFormParams) {
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  // 金額預設自動加總；編輯模式由 init effect 以 initialData.autoCalcAmount 覆寫
  const [autoCalcAmount, setAutoCalcAmount] = useState(true);
  const [locationId, setLocationId] = useState<string>("");
  const [organizerId, setOrganizerId] = useState<string>("");
  const [bankInfoId, setBankInfoId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemDraft[]>([]);
  const [purchaseItemHiddenUpdatingIndex, setPurchaseItemHiddenUpdatingIndex] =
    useState<number | null>(null);
  const [purchaseItemDeletingIndex, setPurchaseItemDeletingIndex] =
    useState<number | null>(null);
  // 新增活動預設帶兩個票價區間（超早鳥／早鳥），可自行填日期或按 X 移除；
  // 編輯模式從 [] 起始，由載入 effect 從 API 回填
  const [priceTiers, setPriceTiers] = useState<PriceTierDraft[]>(
    mode === "create"
      ? [
          { name: "超早鳥", endsAt: "", sortOrder: 0 },
          { name: "早鳥", endsAt: "", sortOrder: 1 },
        ]
      : []
  );
  const [groups, setGroups] = useState<PurchaseItemGroupDraft[]>([]);
  // 群組互斥配對；以群組 key（`id-<id>` / `draft-<index>`）成對表示，與 PurchaseItemsSection 一致
  const [groupExclusions, setGroupExclusions] = useState<Array<[string, string]>>([]);
  const [noticeItems, setNoticeItems] = useState<NoticeItemDraft[]>([]);

  const initializedEventIdRef = useRef<number | null>(null);

  const { startUpload: startCoverUpload, isUploading: isUploadingCover } =
    useUploadThing("eventCover", {
      onClientUploadComplete: (res) => {
        const first = res?.[0];
        const url =
          first &&
          ("url" in first
            ? first.url
            : (first as { ufsUrl?: string }).ufsUrl);
        if (url) {
          setCoverUrl(url);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          setSelectedCoverFile(null);
        }
      },
      onUploadError: (err) => {
        console.error("Cover upload error:", err);
        setSaveError("上傳封面失敗，請重試");
      },
    });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchLocations = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/locations`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations ?? []);
    }
  }, [teamId]);

  const fetchOrganizers = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/organizers`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setOrganizers(data.organizers ?? []);
    }
  }, [teamId]);

  const fetchBankInfos = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/bank-infos`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setBankInfos(data.bankInfos ?? []);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLocations();
    fetchOrganizers();
    fetchBankInfos();
  }, [fetchLocations, fetchOrganizers, fetchBankInfos]);

  useEffect(() => {
    if (mode !== "edit" || !initialData) {
      initializedEventIdRef.current = null;
      return;
    }
    if (initializedEventIdRef.current === initialData.id) return;

    setTitle(initialData.title);
    setDescription(initialData.description ?? "");
    setCoverUrl(initialData.coverUrl);
    setSelectedCoverFile(null);
    setPreviewUrl(null);
    setStartAt(toDateTimeLocal(initialData.startAt));
    setEndAt(toDateTimeLocal(initialData.endAt));
    if (initialData.locationId != null && Number.isInteger(initialData.locationId)) {
      setLocationId(String(initialData.locationId));
    } else {
      // setLocationId("");
    }
    if (initialData.organizerId != null && Number.isInteger(initialData.organizerId)) {
      setOrganizerId(String(initialData.organizerId));
    } else {
      setOrganizerId("");
    }
    if (initialData.bankInfoId != null && Number.isInteger(initialData.bankInfoId)) {
      setBankInfoId(String(initialData.bankInfoId));
    } else {
      setBankInfoId("");
    }
    setAllowMultiple(initialData.allowMultiplePurchase);
    setAutoCalcAmount(initialData.autoCalcAmount);
    initializedEventIdRef.current = initialData.id;
  }, [mode, initialData]);

  useEffect(() => {
    if (mode !== "edit" || !eventId) return;
    Promise.all([
      fetch(`/api/events/${eventId}/purchase-items`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/notice-items`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/price-tiers`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/purchase-item-groups`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/group-exclusions`, {
        credentials: "include",
      }).then((r) => r.json()),
    ]).then(([pData, nData, tData, gData, eData]) => {
      const items = (pData?.purchaseItems ?? []).map(
        (i: {
          id: number;
          name: string;
          amount: number;
          hidden?: boolean;
          groupId?: number | null;
          soldCount?: number;
          prices?: { tierId: number; amount: number }[];
        }) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          hidden: Boolean(i.hidden),
          groupId: i.groupId ?? null,
          soldCount: i.soldCount ?? 0,
          prices: (i.prices ?? []).map((p) => ({
            tierId: p.tierId,
            amount: p.amount,
          })),
        })
      );
      const notices = (nData?.noticeItems ?? []).map(
        (i: { id: number; content: string }) => ({
          id: i.id,
          content: i.content ?? "",
        })
      );
      const tiers = (tData?.priceTiers ?? []).map(
        (t: { id: number; name: string; endsAt: string | null; sortOrder: number }) => ({
          id: t.id,
          name: t.name,
          endsAt: toDateInput(t.endsAt),
          sortOrder: t.sortOrder,
        })
      );
      const groupList = (gData?.groups ?? []).map(
        (g: {
          id: number;
          title: string;
          selectionMode: string;
          required: boolean;
          sortOrder: number;
        }) => ({
          id: g.id,
          title: g.title,
          selectionMode: g.selectionMode === "multiple" ? "multiple" : "single",
          required: Boolean(g.required),
          sortOrder: g.sortOrder,
        })
      );
      const exclusions = (eData?.exclusions ?? []).map(
        (e: { groupAId: number; groupBId: number }): [string, string] => [
          `id-${e.groupAId}`,
          `id-${e.groupBId}`,
        ]
      );
      setPurchaseItems(items);
      setNoticeItems(notices);
      setPriceTiers(tiers);
      setGroups(groupList);
      setGroupExclusions(exclusions);
    });
  }, [mode, eventId]);

  const openDrawer = (type: DrawerType) => () => {
    setDrawer(type);
  };

  const closeDrawer = () => {
    setDrawer(null);
  };

  const handleStartAtChange = (value: string) => {
    setStartAt(value);
    if (value) {
      const startDate = new Date(value);
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const currentEndDate = endAt ? new Date(endAt) : null;
        if (!currentEndDate || currentEndDate <= startDate) {
          const year = endDate.getFullYear();
          const month = String(endDate.getMonth() + 1).padStart(2, "0");
          const day = String(endDate.getDate()).padStart(2, "0");
          const hours = String(endDate.getHours()).padStart(2, "0");
          const minutes = String(endDate.getMinutes()).padStart(2, "0");
          setEndAt(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("請選擇圖片檔案");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setSaveError("圖片大小不能超過 4MB");
      return;
    }

    setSelectedCoverFile(file);
    setSaveError(null);

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const removeCover = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedCoverFile(null);
    } else {
      setCoverUrl(null);
    }
  };

  const handleLocationSuccess = async (locationId: number) => {
    await fetchLocations();
    // setLocationId(String(locationId));
    setDrawer(null);
  };

  const handleOrganizerSuccess = async (organizerId: number) => {
    await fetchOrganizers();
    setOrganizerId(String(organizerId));
    setDrawer(null);
  };

  const handleBankInfoSuccess = async (bankInfoId: number) => {
    await fetchBankInfos();
    setBankInfoId(String(bankInfoId));
    setDrawer(null);
  };

  const handlePurchaseItemSuccess = (item: PurchaseItemDraft) => {
    setPurchaseItems((prev) => [...prev, item]);
    setDrawer(null);
  };

  const handleNoticeItemSuccess = (item: NoticeItemDraft) => {
    setNoticeItems((prev) => [...prev, item]);
    setDrawer(null);
  };

  // 刪除購買項目：草稿直接本地移除；已儲存且零報名時呼叫後端刪除（後端會再次把關）
  const deletePurchaseItem = async (index: number) => {
    const item = purchaseItems[index];
    if (item.id == null) {
      setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (mode !== "edit" || eventId == null) return;
    setPurchaseItemDeletingIndex(index);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-items/${item.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "刪除購買項目失敗");
        return;
      }
      setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
    } catch {
      setSaveError("刪除購買項目失敗");
    } finally {
      setPurchaseItemDeletingIndex(null);
    }
  };

  const removeNoticeItem = (index: number) => {
    const item = noticeItems[index];
    if (item.id != null) return;
    setNoticeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const setPurchaseItemHidden = async (index: number, hidden: boolean) => {
    const item = purchaseItems[index];
    if (item.id == null) {
      setPurchaseItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, hidden } : row))
      );
      return;
    }
    if (mode !== "edit" || eventId == null) return;
    setPurchaseItemHiddenUpdatingIndex(index);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hidden }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "更新購買項目失敗");
        return;
      }
      setPurchaseItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, hidden } : row))
      );
    } catch {
      setSaveError("更新購買項目失敗");
    } finally {
      setPurchaseItemHiddenUpdatingIndex(null);
    }
  };

  // ===== 票價時段 =====
  const addPriceTier = async () => {
    const sortOrder = priceTiers.length;
    if (mode === "edit" && eventId != null) {
      try {
        const res = await fetch(`/api/events/${eventId}/price-tiers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: "新時段", endsAt: "", sortOrder }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || "新增時段失敗");
          return;
        }
        setPriceTiers((prev) => [
          ...prev,
          { id: data.priceTier?.id, name: "新時段", endsAt: "", sortOrder },
        ]);
      } catch {
        setSaveError("新增時段失敗");
      }
      return;
    }
    setPriceTiers((prev) => [...prev, { name: "新時段", endsAt: "", sortOrder }]);
  };

  const updatePriceTier = (
    index: number,
    field: "name" | "endsAt",
    value: string
  ) => {
    setPriceTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  // edit 模式：欄位失焦時把該時段變更存回後端
  const persistPriceTier = async (index: number) => {
    if (mode !== "edit" || eventId == null) return;
    const tier = priceTiers[index];
    if (tier?.id == null) return;
    try {
      const res = await fetch(`/api/events/${eventId}/price-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: tier.name, endsAt: tier.endsAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSaveError(data.error || "更新時段失敗");
    } catch {
      setSaveError("更新時段失敗");
    }
  };

  const removePriceTier = async (index: number) => {
    const tier = priceTiers[index];
    if (mode === "edit" && eventId != null && tier?.id != null) {
      try {
        const res = await fetch(
          `/api/events/${eventId}/price-tiers/${tier.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || "刪除時段失敗");
          return;
        }
      } catch {
        setSaveError("刪除時段失敗");
        return;
      }
    }
    setPriceTiers((prev) => prev.filter((_, i) => i !== index));
    // 同步移除本地草稿項目中參照到此時段的價格
    setPurchaseItems((prev) =>
      prev.map((item) => ({
        ...item,
        prices: (item.prices ?? []).filter(
          (p) => p.tierDraftIndex !== index && p.tierId !== tier?.id
        ),
      }))
    );
  };

  // ===== 票種群組 =====
  const addGroup = async () => {
    const sortOrder = groups.length;
    if (mode === "edit" && eventId != null) {
      try {
        const res = await fetch(`/api/events/${eventId}/purchase-item-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: "新群組",
            selectionMode: "single",
            required: true,
            sortOrder,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || "新增群組失敗");
          return;
        }
        setGroups((prev) => [
          ...prev,
          {
            id: data.group?.id,
            title: "新群組",
            selectionMode: "single",
            required: true,
            sortOrder,
          },
        ]);
      } catch {
        setSaveError("新增群組失敗");
      }
      return;
    }
    setGroups((prev) => [
      ...prev,
      { title: "新群組", selectionMode: "single", required: true, sortOrder },
    ]);
  };

  const updateGroup = <K extends keyof PurchaseItemGroupDraft>(
    index: number,
    field: K,
    value: PurchaseItemGroupDraft[K]
  ) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  // edit 模式：欄位變更時把該群組存回後端
  const persistGroup = async (index: number) => {
    if (mode !== "edit" || eventId == null) return;
    const group = groups[index];
    if (group?.id == null) return;
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-item-groups/${group.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: group.title,
            selectionMode: group.selectionMode,
            required: group.required,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSaveError(data.error || "更新群組失敗");
    } catch {
      setSaveError("更新群組失敗");
    }
  };

  const removeGroup = async (index: number) => {
    const group = groups[index];
    if (mode === "edit" && eventId != null && group?.id != null) {
      try {
        const res = await fetch(
          `/api/events/${eventId}/purchase-item-groups/${group.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || "刪除群組失敗");
          return;
        }
      } catch {
        setSaveError("刪除群組失敗");
        return;
      }
    }
    setGroups((prev) => prev.filter((_, i) => i !== index));
    // 同步清掉本地項目對此群組的歸屬
    setPurchaseItems((prev) =>
      prev.map((item) =>
        item.groupDraftIndex === index || (group?.id != null && item.groupId === group.id)
          ? { ...item, groupId: null, groupDraftIndex: undefined }
          : item
      )
    );
    // 同步移除任何指向此群組的互斥配對
    const removedKey = group?.id != null ? `id-${group.id}` : `draft-${index}`;
    setGroupExclusions((prev) => {
      const next = prev.filter((p) => p[0] !== removedKey && p[1] !== removedKey);
      if (next.length !== prev.length) void persistGroupExclusions(next);
      return next;
    });
  };

  // ---- 群組互斥（Phase 2.5）----
  const samePair = (p: [string, string], a: string, b: string) =>
    (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

  const isGroupExcluded = (keyA: string, keyB: string) =>
    groupExclusions.some((p) => samePair(p, keyA, keyB));

  // edit 模式：把互斥配對（僅含已存檔群組的 `id-` key）整批 PUT 回後端
  const persistGroupExclusions = async (pairs: Array<[string, string]>) => {
    if (mode !== "edit" || eventId == null) return;
    const exclusions = pairs
      .map(([a, b]) => {
        const ga = a.startsWith("id-") ? Number(a.slice(3)) : NaN;
        const gb = b.startsWith("id-") ? Number(b.slice(3)) : NaN;
        return Number.isInteger(ga) && Number.isInteger(gb)
          ? { groupAId: ga, groupBId: gb }
          : null;
      })
      .filter((x): x is { groupAId: number; groupBId: number } => x != null);
    try {
      const res = await fetch(`/api/events/${eventId}/group-exclusions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ exclusions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "更新互斥規則失敗");
      }
    } catch {
      setSaveError("更新互斥規則失敗");
    }
  };

  const toggleGroupExclusion = (keyA: string, keyB: string) => {
    setGroupExclusions((prev) => {
      const exists = prev.some((p) => samePair(p, keyA, keyB));
      const next: Array<[string, string]> = exists
        ? prev.filter((p) => !samePair(p, keyA, keyB))
        : [...prev, [keyA, keyB]];
      void persistGroupExclusions(next);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError("請輸入標題");
      return;
    }
    if (!locationId || !locationId.trim()) {
      setSaveError("請選擇活動地點");
      return;
    }
    if (!organizerId || !organizerId.trim()) {
      setSaveError("請選擇主辦單位");
      return;
    }
    if (!bankInfoId || !bankInfoId.trim()) {
      setSaveError("請選擇銀行資訊");
      return;
    }
    setSaving(true);
    try {
      let finalCoverUrl = coverUrl;
      if (selectedCoverFile) {
        try {
          const uploadResult = await startCoverUpload([selectedCoverFile]);
          if (!uploadResult || uploadResult.length === 0) {
            throw new Error("上傳失敗");
          }
          const first = uploadResult[0];
          finalCoverUrl =
            first &&
            ("url" in first
              ? first.url
              : (first as { ufsUrl?: string }).ufsUrl) ||
            null;
          if (!finalCoverUrl) {
            throw new Error("無法取得上傳後的圖片網址");
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          setSaveError(
            uploadError instanceof Error ? uploadError.message : "上傳封面失敗，請重試"
          );
          setSaving(false);
          return;
        }
      }
      if (mode === "edit" && eventId != null) {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: trimmedTitle,
            description: description.trim() || null,
            coverUrl: finalCoverUrl || null,
            startAt: datetimeLocalToISO(startAt),
            endAt: datetimeLocalToISO(endAt),
            locationId: Number(locationId),
            organizerId: Number(organizerId),
            bankInfoId: Number(bankInfoId),
            allowMultiplePurchase: allowMultiple,
            autoCalcAmount: autoCalcAmount,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || "更新失敗");
          setSaving(false);
          return;
        }
        onSaveSuccess?.();
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            teamId,
            title: trimmedTitle,
            description: description.trim() || undefined,
            coverUrl: finalCoverUrl || undefined,
            startAt: datetimeLocalToISO(startAt),
            endAt: datetimeLocalToISO(endAt),
            locationId: Number(locationId),
            organizerId: Number(organizerId),
            bankInfoId: Number(bankInfoId),
            allowMultiplePurchase: allowMultiple,
            autoCalcAmount: autoCalcAmount,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || "儲存失敗");
          setSaving(false);
          return;
        }
        const newEventId = data.event?.id;
        if (newEventId != null) {
          // 先建立群組，取得 draftIndex → 真實 groupId 的對照
          const groupIdByDraftIndex = new Map<number, number>();
          for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const gRes = await fetch(
              `/api/events/${newEventId}/purchase-item-groups`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: group.title,
                  selectionMode: group.selectionMode,
                  required: group.required,
                  sortOrder: i,
                }),
              }
            );
            const gData = await gRes.json().catch(() => ({}));
            if (gRes.ok && gData.group?.id != null) {
              groupIdByDraftIndex.set(i, gData.group.id);
            }
          }

          // 群組互斥：把 key（`draft-<index>`）解析成真實 groupId 後整批寫入
          const resolveExclusionKey = (key: string): number | null => {
            if (key.startsWith("id-")) return Number(key.slice(3));
            if (key.startsWith("draft-"))
              return groupIdByDraftIndex.get(Number(key.slice(6))) ?? null;
            return null;
          };
          const exclusionPayload = groupExclusions
            .map(([a, b]) => {
              const ga = resolveExclusionKey(a);
              const gb = resolveExclusionKey(b);
              return ga != null && gb != null ? { groupAId: ga, groupBId: gb } : null;
            })
            .filter((x): x is { groupAId: number; groupBId: number } => x != null);
          if (exclusionPayload.length > 0) {
            await fetch(`/api/events/${newEventId}/group-exclusions`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ exclusions: exclusionPayload }),
            });
          }

          // 再建立時段，取得 draftIndex → 真實 tierId 的對照
          const tierIdByDraftIndex = new Map<number, number>();
          for (let i = 0; i < priceTiers.length; i++) {
            const tier = priceTiers[i];
            const tRes = await fetch(`/api/events/${newEventId}/price-tiers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: tier.name,
                endsAt: tier.endsAt || null,
                sortOrder: i,
              }),
            });
            const tData = await tRes.json().catch(() => ({}));
            if (tRes.ok && tData.priceTier?.id != null) {
              tierIdByDraftIndex.set(i, tData.priceTier.id);
            }
          }

          for (let i = 0; i < purchaseItems.length; i++) {
            const item = purchaseItems[i];
            const prices = (item.prices ?? [])
              .map((p) => {
                const tierId =
                  p.tierId ??
                  (p.tierDraftIndex != null
                    ? tierIdByDraftIndex.get(p.tierDraftIndex)
                    : undefined);
                return tierId != null ? { tierId, amount: p.amount } : null;
              })
              .filter((p): p is { tierId: number; amount: number } => p !== null);
            const groupId =
              item.groupId ??
              (item.groupDraftIndex != null
                ? groupIdByDraftIndex.get(item.groupDraftIndex) ?? null
                : null);
            await fetch(`/api/events/${newEventId}/purchase-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: item.name,
                amount: item.amount,
                sortOrder: i,
                hidden: item.hidden === true,
                groupId,
                prices,
              }),
            });
          }
          for (let i = 0; i < noticeItems.length; i++) {
            await fetch(`/api/events/${newEventId}/notice-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                content: noticeItems[i].content,
                sortOrder: i,
              }),
            });
          }
        }
        window.location.href = "/events";
      }
    } catch {
      setSaveError(mode === "edit" ? "更新失敗" : "儲存失敗");
    }
    setSaving(false);
  };

  return {
    // State reads
    drawer,
    allowMultiple,
    autoCalcAmount,
    locationId,
    organizerId,
    bankInfoId,
    locations,
    organizers,
    bankInfos,
    title,
    description,
    startAt,
    endAt,
    coverUrl,
    previewUrl,
    isUploadingCover,
    purchaseItems,
    purchaseItemHiddenUpdatingIndex,
    purchaseItemDeletingIndex,
    priceTiers,
    groups,
    groupExclusions,
    noticeItems,
    saveError,
    saving,
    // Simple setters
    setTitle,
    setDescription,
    setEndAt,
    setLocationId,
    setOrganizerId,
    setBankInfoId,
    setAllowMultiple,
    setAutoCalcAmount,
    // Handlers
    handleStartAtChange,
    handleFileSelect,
    removeCover,
    openDrawer,
    closeDrawer,
    handleLocationSuccess,
    handleOrganizerSuccess,
    handleBankInfoSuccess,
    handlePurchaseItemSuccess,
    handleNoticeItemSuccess,
    deletePurchaseItem,
    removeNoticeItem,
    setPurchaseItemHidden,
    addPriceTier,
    updatePriceTier,
    persistPriceTier,
    removePriceTier,
    addGroup,
    updateGroup,
    persistGroup,
    removeGroup,
    isGroupExcluded,
    toggleGroupExclusion,
    handleSubmit,
  };
}
