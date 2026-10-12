"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageUp, X, ZoomIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented";
import { DescriptionEditor } from "./DescriptionEditor";
import { LocationSelect } from "./LocationSelect";
import { OrganizerSelect } from "./OrganizerSelect";
import { BankInfoSelect } from "./BankInfoSelect";
import { LinePayeeSelect } from "./LinePayeeSelect";
import { EVENT_TYPES, isEventType, type EventType } from "@/lib/event-templates";
import type { UseEventFormReturn } from "@/hooks/use-event-form";
import { useMediaQuery } from "@/hooks/use-media-query";

type BasicInfoLayoutProps = {
  mode: "create" | "edit";
  form: UseEventFormReturn;
};

const CARD = "surface-card flex flex-col gap-3 p-4";

function CardHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[15px] font-bold text-ink">{children}</h2>;
}

/**
 * 基本資訊（含主辦與收款）的版面，create 與 edit 共用。
 *
 * 桌機雙欄：左邊是要「寫」的（標題、描述），右邊是要「選」的，依修改頻率由上到下
 * （時間地點 → 封面 → 主辦與收款），一個畫面看得完。
 * 手機單欄，時間地點排在長描述前面，不然要滑很久才看得到 —— 所以描述編輯器
 * 在桌機放左欄卡片裡、手機自成一張卡排在後面（同時只掛載一份，上傳狀態才不會分裂）。
 */
export function BasicInfoLayout({ mode, form }: BasicInfoLayoutProps) {
  const {
    type,
    setType,
    applyTemplate,
    title,
    setTitle,
    description,
    setDescription,
    coverUrl,
    previewUrl,
    startAt,
    endAt,
    setEndAt,
    handleStartAtChange,
    handleFileSelect,
    removeCover,
    locationId,
    locations,
    setLocationId,
    organizerId,
    organizers,
    setOrganizerId,
    bankInfoId,
    bankInfos,
    setBankInfoId,
    linePayeeId,
    linePayees,
    setLinePayeeId,
    openDrawer,
  } = form;

  const isWide = useMediaQuery("(min-width: 1024px)");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const coverSrc = previewUrl || coverUrl || "";

  // 切換活動類型：create 模式會以新範本覆蓋販售項目（需確認）；edit 模式僅變更類型
  const handleTypeChange = (next: EventType) => {
    // 擋掉非法值以免蓋掉已載入的類型
    if (!isEventType(next) || next === type) return;
    if (mode === "create") {
      const ok = window.confirm(
        "切換類型會以新範本覆蓋目前的票價時段、票券區塊與票券設定，確定要切換嗎？"
      );
      if (!ok) return;
      applyTemplate(next);
    }
    setType(next);
  };

  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* 左欄：活動內容，桌機跨右欄三張卡的高度 */}
      <section className={`${CARD} lg:row-span-3`} aria-label="活動內容">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor="title">標題</Label>
            <Input
              id="title"
              placeholder="輸入標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-base font-semibold md:text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>活動類型</Label>
            <SegmentedToggle
              size="md"
              aria-label="活動類型"
              value={type}
              onChange={(v) => handleTypeChange(v as EventType)}
              options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              className="h-11 p-1"
            />
          </div>
        </div>
        {mode === "create" && (
          <p className="-mt-2 text-xs text-muted-ink">
            {EVENT_TYPES.find((t) => t.value === type)?.description}
          </p>
        )}

        {isWide && <DescriptionEditor value={description} onChange={setDescription} tall />}
      </section>

      <section className={CARD} aria-label="時間與地點">
        <CardHeading>時間與地點</CardHeading>
        {/* 標籤與欄位同一列：右欄只有 380px，兩個 datetime 並排會被截掉 */}
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Label htmlFor="startTime" className="w-8 shrink-0 text-muted-ink">開始</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startAt}
              onChange={(e) => handleStartAtChange(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <Label htmlFor="endTime" className="w-8 shrink-0 text-muted-ink">結束</Label>
            <Input
              id="endTime"
              type="datetime-local"
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
      </section>

      {!isWide && (
        <section className={CARD} aria-label="活動描述">
          <DescriptionEditor value={description} onChange={setDescription} />
        </section>
      )}

      <section className={CARD} aria-label="活動封面">
        <CardHeading>活動封面</CardHeading>
        {coverSrc ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative block aspect-video w-36 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-card-border bg-field"
              aria-label="放大檢視封面"
            >
              <Image src={coverSrc} alt="活動封面" fill className="object-cover" sizes="144px" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                <ZoomIn className="size-6 text-white" />
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-ink transition-colors hover:border-ink">
                <input type="file" accept="image/*" onChange={handleFileSelect} className="sr-only" />
                <ImageUp className="size-4" />
                更換圖片
              </label>
              <button
                type="button"
                onClick={removeCover}
                className="h-9 cursor-pointer rounded-lg text-sm text-red-700 transition-colors hover:bg-red-50"
              >
                移除
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-400 px-4 py-5 text-muted-ink transition-colors hover:border-brand-strong hover:text-ink">
            <input type="file" accept="image/*" onChange={handleFileSelect} className="sr-only" />
            <ImageUp className="size-6 shrink-0" />
            <span className="flex flex-col">
              <span className="text-sm font-medium">點擊選擇圖片</span>
              <span className="text-xs">建議 16:9 ・ 最大 4MB</span>
            </span>
          </label>
        )}
      </section>

      <section className={CARD} aria-label="主辦與收款">
        <CardHeading>主辦與收款</CardHeading>
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
        <LinePayeeSelect
          value={linePayeeId}
          linePayees={linePayees}
          onValueChange={setLinePayeeId}
          onAddClick={openDrawer("linePayee")}
        />
      </section>

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
