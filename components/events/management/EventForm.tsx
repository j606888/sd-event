"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationSelect } from "./LocationSelect";
import { OrganizerSelect } from "./OrganizerSelect";
import { BankInfoSelect } from "./BankInfoSelect";
import { PurchaseItemsSection } from "./PurchaseItemsSection";
import { LocationDrawer } from "./LocationDrawer";
import { OrganizerDrawer } from "./OrganizerDrawer";
import { BankInfoDrawer } from "./BankInfoDrawer";
import { PurchaseItemDrawer } from "./PurchaseItemDrawer";
import { NoticeItemDrawer } from "./NoticeItemDrawer";
import { useEventForm } from "@/hooks/use-event-form";
import { EVENT_TYPES, isEventType, type EventType } from "@/lib/event-templates";

export type { EventFormInitialData } from "@/hooks/use-event-form";

type SectionId = "basic" | "items" | "contact";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "基本資訊" },
  { id: "items", label: "販售項目" },
  { id: "contact", label: "主辦 & 收款" },
];

type EventFormProps = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: import("@/hooks/use-event-form").EventFormInitialData;
  /** create 模式的初始類型（由建立頁的範本選擇器帶入） */
  initialType?: EventType;
  submitLabel: string;
  onSaveSuccess?: () => void;
  renderExtraActions?: React.ReactNode;
};

export function EventForm({
  mode,
  teamId,
  eventId,
  initialData,
  initialType,
  submitLabel,
  onSaveSuccess,
  renderExtraActions,
}: EventFormProps) {
  const {
    drawer,
    type,
    setType,
    applyTemplate,
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
    purchaseItems,
    purchaseItemHiddenUpdatingIndex,
    purchaseItemDeletingIndex,
    editingItemIndex,
    priceTiers,
    groups,
    noticeItems,
    coupons,
    saveError,
    saving,
    setTitle,
    setDescription,
    setEndAt,
    setLocationId,
    setOrganizerId,
    setBankInfoId,
    setAutoCalcAmount,
    handleStartAtChange,
    handleFileSelect,
    removeCover,
    openDrawer,
    closeDrawer,
    handleLocationSuccess,
    handleOrganizerSuccess,
    handleBankInfoSuccess,
    handlePurchaseItemSuccess,
    handlePurchaseItemUpdated,
    openPurchaseItemAdder,
    openPurchaseItemEditor,
    handleNoticeItemSuccess,
    deletePurchaseItem,
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
    addCoupon,
    updateCoupon,
    persistCoupon,
    removeCoupon,
    handleSubmit,
  } = useEventForm({ mode, teamId, eventId, initialData, initialType, onSaveSuccess });

  // 切換活動類型：create 模式會以新範本覆蓋販售項目（需確認）；edit 模式僅變更類型
  const handleTypeChange = (next: EventType) => {
    // Radix Select 的隱藏 native select 可能被外部 change 事件（如瀏覽器 autofill）
    // 以空字串觸發 onValueChange，須擋掉非法值以免蓋掉已載入的類型
    if (!isEventType(next) || next === type) return;
    if (mode === "create") {
      const ok = window.confirm(
        "切換類型會以新範本覆蓋目前的票價時段、群組與購買項目設定，確定要切換嗎？"
      );
      if (!ok) return;
      applyTemplate(next);
    }
    setType(next);
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("basic");
  const coverSrc = previewUrl || coverUrl || "";

  // 送出前若必填欄位缺漏，先切到含該欄位的 Tab，讓使用者看得到錯誤
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!title.trim() || !locationId) {
      setActiveSection("basic");
    } else if (!organizerId || !bankInfoId) {
      setActiveSection("contact");
    }
    handleSubmit(e);
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {saveError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {saveError}
          </p>
        )}

        {/* 分段切換：基本資訊 / 販售項目 / 主辦 & 收款 */}
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={activeSection === s.id}
              onClick={() => setActiveSection(s.id)}
              className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                activeSection === s.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 基本資訊 */}
        <div
          className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 ${
            activeSection === "basic" ? "" : "hidden"
          }`}
        >
        <div className="flex flex-col gap-2">
          <Label htmlFor="eventType">活動類型</Label>
          {mode === "create" ? (
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={type === t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    type === t.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <Select value={type} onValueChange={(v) => handleTypeChange(v as EventType)}>
              <SelectTrigger id="eventType" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {mode === "create" && (
            <p className="text-xs text-gray-400">
              {EVENT_TYPES.find((t) => t.value === type)?.description}
            </p>
          )}
        </div>
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
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-[#F3F5F7] px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 md:text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>活動封面</Label>
          {(coverUrl || previewUrl) ? (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative block aspect-video w-full max-w-md cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                aria-label="放大檢視封面"
              >
                <Image
                  src={coverSrc}
                  alt="活動封面"
                  fill
                  className="object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                  <ZoomIn className="size-8 text-white" />
                </span>
              </button>
              <button
                type="button"
                onClick={removeCover}
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
        </div>

        {/* 販售項目 */}
        <div
          className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 ${
            activeSection === "items" ? "" : "hidden"
          }`}
        >
        <PurchaseItemsSection
          items={purchaseItems}
          autoCalcAmount={autoCalcAmount}
          priceTiers={priceTiers}
          groups={groups}
          onAutoCalcAmountChange={setAutoCalcAmount}
          onAddClick={openPurchaseItemAdder}
          onEditItem={openPurchaseItemEditor}
          onDeleteItem={deletePurchaseItem}
          itemDeletingIndex={purchaseItemDeletingIndex}
          onSetItemHidden={setPurchaseItemHidden}
          itemHiddenUpdatingIndex={purchaseItemHiddenUpdatingIndex}
          onAddTier={addPriceTier}
          onUpdateTier={updatePriceTier}
          onPersistTier={persistPriceTier}
          onRemoveTier={removePriceTier}
          onAddGroup={addGroup}
          onUpdateGroup={updateGroup}
          onPersistGroup={persistGroup}
          onRemoveGroup={removeGroup}
          isGroupExcluded={isGroupExcluded}
          onToggleGroupExclusion={toggleGroupExclusion}
          coupons={coupons}
          onAddCoupon={addCoupon}
          onUpdateCoupon={updateCoupon}
          onPersistCoupon={persistCoupon}
          onRemoveCoupon={removeCoupon}
        />
        </div>

        {/* 主辦 & 收款 */}
        <div
          className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 ${
            activeSection === "contact" ? "" : "hidden"
          }`}
        >
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
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          {mode === "create" && (
            <Button type="button" variant="outline" asChild className="flex-1 min-w-[100px]">
              <Link href="/events">取消</Link>
            </Button>
          )}
          {renderExtraActions}
          <Button
            type="submit"
            className="flex-1 min-w-[100px] bg-primary text-white hover:bg-brand-hover"
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
              : drawer === "purchaseItem" && editingItemIndex != null
                ? "Edit Item"
                : "New Item"
          }
          title={
            drawer === "location"
              ? "新增活動地點"
              : drawer === "purchaseItem"
                ? editingItemIndex != null
                  ? "編輯購買項目"
                  : "新增購買項目"
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
              priceTiers={priceTiers}
              groups={groups}
              editingItem={
                editingItemIndex != null
                  ? { item: purchaseItems[editingItemIndex], index: editingItemIndex }
                  : undefined
              }
              onSuccess={handlePurchaseItemSuccess}
              onUpdated={handlePurchaseItemUpdated}
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

      {lightboxOpen && coverSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="活動封面預覽"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="關閉預覽"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs natural-resolution detail and supports blob: preview URLs */}
          <img
            src={coverSrc}
            alt="活動封面"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
