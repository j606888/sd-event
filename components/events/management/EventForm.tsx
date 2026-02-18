"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useUploadThing } from "@/lib/uploadthing";
import { LocationSelect } from "./LocationSelect";
import { OrganizerSelect } from "./OrganizerSelect";
import { BankInfoSelect } from "./BankInfoSelect";
import { PurchaseItemsSection } from "./PurchaseItemsSection";
import { NoticeItemsSection } from "./NoticeItemsSection";
import { LocationDrawer } from "./LocationDrawer";
import { OrganizerDrawer } from "./OrganizerDrawer";
import { BankInfoDrawer } from "./BankInfoDrawer";
import { PurchaseItemDrawer } from "./PurchaseItemDrawer";
import { NoticeItemDrawer } from "./NoticeItemDrawer";

type DrawerType =
  | null
  | "location"
  | "purchaseItem"
  | "notice"
  | "organizer"
  | "bank";

type Location = { id: number; name: string };
type Organizer = { id: number; name: string };
type BankInfo = { id: number; bankName: string };
type PurchaseItemDraft = { id?: number; name: string; amount: number };
type NoticeItemDraft = { id?: number; content: string };

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
};

function toDateTimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Convert to local time for datetime-local input
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert datetime-local string (YYYY-MM-DDTHH:mm) to ISO string
 * Preserves the local time as the intended time, converting to UTC properly
 */
function datetimeLocalToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return new Date().toISOString();
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  // Create a Date object treating it as local time
  const localDate = new Date(datetimeLocal);
  // Check if the date is valid
  if (isNaN(localDate.getTime())) {
    return new Date().toISOString();
  }
  // Return ISO string which will be in UTC
  return localDate.toISOString();
}

type EventFormProps = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: EventFormInitialData;
  submitLabel: string;
  onSaveSuccess?: () => void;
  renderExtraActions?: React.ReactNode;
};

export function EventForm({
  mode,
  teamId,
  eventId,
  initialData,
  submitLabel,
  onSaveSuccess,
  renderExtraActions,
}: EventFormProps) {
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
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

  // Auto-update end time when start time changes
  const handleStartAtChange = (value: string) => {
    setStartAt(value);
    if (value) {
      const startDate = new Date(value);
      if (!isNaN(startDate.getTime())) {
        // Add 1 hour to start time
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        // Check if current end time is before or equal to new start time
        const currentEndDate = endAt ? new Date(endAt) : null;
        if (!currentEndDate || currentEndDate <= startDate) {
          // Format as datetime-local: YYYY-MM-DDTHH:mm
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { startUpload: startCoverUpload, isUploading: isUploadingCover } = useUploadThing("eventCover", {
    onClientUploadComplete: (res) => {
      const first = res?.[0];
      const url =
        first &&
        ("url" in first
          ? first.url
          : (first as { ufsUrl?: string }).ufsUrl);
      if (url) {
        setCoverUrl(url);
        // Clean up preview URL
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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemDraft[]>([]);
  const [noticeItems, setNoticeItems] = useState<NoticeItemDraft[]>([]);

  const initializedEventIdRef = useRef<number | null>(null);

  const openDrawer = (type: DrawerType) => () => {
    setDrawer(type);
  };
  const closeDrawer = () => {
    setDrawer(null);
  };

  const fetchLocations = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/locations`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations ?? []);
    }
  }, [teamId]);
  const fetchOrganizers = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/organizers`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setOrganizers(data.organizers ?? []);
    }
  }, [teamId]);
  const fetchBankInfos = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/bank-infos`, { credentials: "include" });
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
    // Only initialize once per event ID
    if (initializedEventIdRef.current === initialData.id) return;
    
    setTitle(initialData.title);
    setDescription(initialData.description ?? "");
    setCoverUrl(initialData.coverUrl);
    setSelectedCoverFile(null);
    setPreviewUrl(null);
    setStartAt(toDateTimeLocal(initialData.startAt));
    setEndAt(toDateTimeLocal(initialData.endAt));
    // Set IDs only if they exist and are valid numbers
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
    initializedEventIdRef.current = initialData.id;
  }, [mode, initialData]);

  useEffect(() => {
    if (mode !== "edit" || !eventId) return;
    Promise.all([
      fetch(`/api/events/${eventId}/purchase-items`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/notice-items`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([pData, nData]) => {
      const items = (pData?.items ?? []).map((i: { id: number; name: string; amount: number }) => ({
        id: i.id,
        name: i.name,
        amount: i.amount,
      }));
      const notices = (nData?.items ?? []).map((i: { id: number; content: string }) => ({
        id: i.id,
        content: i.content ?? "",
      }));
      setPurchaseItems(items);
      setNoticeItems(notices);
    });
  }, [mode, eventId]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSaveError("請選擇圖片檔案");
      return;
    }

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      setSaveError("圖片大小不能超過 4MB");
      return;
    }

    setSelectedCoverFile(file);
    setSaveError(null);

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
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
      // Upload cover image if a new file is selected
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
          setSaveError(uploadError instanceof Error ? uploadError.message : "上傳封面失敗，請重試");
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
          for (let i = 0; i < purchaseItems.length; i++) {
            const item = purchaseItems[i];
            await fetch(`/api/events/${newEventId}/purchase-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ name: item.name, amount: item.amount, sortOrder: i }),
            });
          }
          for (let i = 0; i < noticeItems.length; i++) {
            await fetch(`/api/events/${newEventId}/notice-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ content: noticeItems[i].content, sortOrder: i }),
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

  return (
    <div className="w-full">
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">標題</Label>
          <Input
            id="title"
            placeholder="輸入標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">活動描述</Label>
          <textarea
            id="description"
            placeholder="輸入活動描述"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-[#F3F5F7] px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 md:text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>活動封面</Label>
          {(coverUrl || previewUrl) ? (
            <div className="relative inline-block">
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={previewUrl || coverUrl || ""}
                  alt="活動封面"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) {
                    // If there's a preview, remove the selected file and preview
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setSelectedCoverFile(null);
                  } else {
                    // If no preview, remove the existing cover URL
                    setCoverUrl(null);
                  }
                }}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="移除封面"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <svg
                    className="size-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span className="text-sm font-medium">點擊選擇圖片</span>
                  <span className="text-xs">或拖放圖片到此處</span>
                  <span className="text-xs text-gray-400">最大 4MB</span>
                </div>
              </label>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startTime">開始時間</Label>
            <Input
              id="startTime"
              type="datetime-local"
              className="bg-[#F3F5F7]"
              value={startAt}
              onChange={(e) => handleStartAtChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endTime">結束時間</Label>
            <Input
              id="endTime"
              type="datetime-local"
              className="bg-[#F3F5F7]"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
        </div>
        <LocationSelect
          value={locationId}
          locations={locations}
          onValueChange={setLocationId}
          onAddClick={openDrawer("location")}
        />
        <PurchaseItemsSection
          items={purchaseItems}
          allowMultiple={allowMultiple}
          onAllowMultipleChange={setAllowMultiple}
          onAddClick={openDrawer("purchaseItem")}
          onRemove={removePurchaseItem}
        />
        <NoticeItemsSection
          items={noticeItems}
          onAddClick={openDrawer("notice")}
          onRemove={removeNoticeItem}
        />
        <OrganizerSelect
          value={organizerId}
          organizers={organizers}
          onValueChange={setOrganizerId}
          onAddClick={openDrawer("organizer")}
        />
        <BankInfoSelect
          value={bankInfoId}
          bankInfos={bankInfos}
          onValueChange={setBankInfoId}
          onAddClick={openDrawer("bank")}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {mode === "create" && (
            <Button type="button" variant="outline" asChild className="flex-1 min-w-[100px]">
              <Link href="/events">取消</Link>
            </Button>
          )}
          {renderExtraActions}
          <Button
            type="submit"
            className="flex-1 min-w-[100px] bg-gray-900 text-white hover:bg-gray-800"
            disabled={saving}
          >
            {saving ? (mode === "edit" ? "更新中…" : "儲存中…") : submitLabel}
          </Button>
        </div>
      </form>

      {drawer !== null && (
        <Drawer
          open={true}
          onClose={closeDrawer}
          subtitle={
            drawer === "location" || drawer === "organizer" || drawer === "bank"
              ? "New"
              : "New Item"
          }
          title={
            drawer === "location"
              ? "新增活動地點"
              : drawer === "purchaseItem"
                ? "新增購買項目"
                : drawer === "notice"
                  ? "新增須知項目"
                  : drawer === "organizer"
                    ? "新增主辦單位"
                    : "新增銀行資訊"
          }
        >
          {drawer === "location" && (
            <LocationDrawer
              teamId={teamId}
              onSuccess={handleLocationSuccess}
              onCancel={closeDrawer}
            />
          )}
          {drawer === "purchaseItem" && (
            <PurchaseItemDrawer
              mode={mode}
              eventId={eventId}
              currentItems={purchaseItems}
              onSuccess={handlePurchaseItemSuccess}
              onCancel={closeDrawer}
            />
          )}
          {drawer === "notice" && (
            <NoticeItemDrawer
              mode={mode}
              eventId={eventId}
              currentItems={noticeItems}
              onSuccess={handleNoticeItemSuccess}
              onCancel={closeDrawer}
            />
          )}
          {drawer === "organizer" && (
            <OrganizerDrawer
              teamId={teamId}
              onSuccess={handleOrganizerSuccess}
              onCancel={closeDrawer}
            />
          )}
          {drawer === "bank" && (
            <BankInfoDrawer
              teamId={teamId}
              onSuccess={handleBankInfoSuccess}
              onCancel={closeDrawer}
            />
          )}
        </Drawer>
      )}
    </div>
  );
}
