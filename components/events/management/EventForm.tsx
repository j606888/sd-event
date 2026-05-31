"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
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
import { useEventForm } from "@/hooks/use-event-form";

export type { EventFormInitialData } from "@/hooks/use-event-form";

type EventFormProps = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: import("@/hooks/use-event-form").EventFormInitialData;
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
  const {
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
    purchaseItems,
    purchaseItemHiddenUpdatingIndex,
    noticeItems,
    saveError,
    saving,
    setTitle,
    setDescription,
    setEndAt,
    setLocationId,
    setOrganizerId,
    setBankInfoId,
    setAllowMultiple,
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
    handleNoticeItemSuccess,
    removePurchaseItem,
    removeNoticeItem,
    setPurchaseItemHidden,
    handleSubmit,
  } = useEventForm({ mode, teamId, eventId, initialData, onSaveSuccess });

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
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={previewUrl || coverUrl || ""}
                  alt="活動封面"
                  fill
                  className="object-cover"
                />
              </div>
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
        <PurchaseItemsSection
          items={purchaseItems}
          allowMultiple={allowMultiple}
          autoCalcAmount={autoCalcAmount}
          onAllowMultipleChange={setAllowMultiple}
          onAutoCalcAmountChange={setAutoCalcAmount}
          onAddClick={openDrawer("purchaseItem")}
          onRemove={removePurchaseItem}
          onSetItemHidden={setPurchaseItemHidden}
          itemHiddenUpdatingIndex={purchaseItemHiddenUpdatingIndex}
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
