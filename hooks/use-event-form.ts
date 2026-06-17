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
type Organizer = { id: number; name: string };
type BankInfo = { id: number; bankName: string };

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
  const [autoCalcAmount, setAutoCalcAmount] = useState(false);
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
  const [priceTiers, setPriceTiers] = useState<PriceTierDraft[]>([]);
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
    ]).then(([pData, nData, tData]) => {
      const items = (pData?.purchaseItems ?? []).map(
        (i: {
          id: number;
          name: string;
          amount: number;
          hidden?: boolean;
          prices?: { tierId: number; amount: number }[];
        }) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          hidden: Boolean(i.hidden),
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
      setPurchaseItems(items);
      setNoticeItems(notices);
      setPriceTiers(tiers);
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

  const removePurchaseItem = (index: number) => {
    const item = purchaseItems[index];
    if (item.id != null) return;
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
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
          // 先建立時段，取得 draftIndex → 真實 tierId 的對照
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
            await fetch(`/api/events/${newEventId}/purchase-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: item.name,
                amount: item.amount,
                sortOrder: i,
                hidden: item.hidden === true,
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
    priceTiers,
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
    removePurchaseItem,
    removeNoticeItem,
    setPurchaseItemHidden,
    addPriceTier,
    updatePriceTier,
    persistPriceTier,
    removePriceTier,
    handleSubmit,
  };
}
