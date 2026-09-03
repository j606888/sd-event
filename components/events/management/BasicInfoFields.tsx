"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedToggle } from "@/components/ui/segmented";
import { Markdown } from "@/components/ui/markdown";
import { LocationSelect } from "./LocationSelect";
import { EVENT_TYPES, isEventType, type EventType } from "@/lib/event-templates";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

const DESCRIPTION_PLACEHOLDER = `輸入活動描述，可使用 Markdown

## 活動時程
- 14:00 Workshop 第一堂
- 16:00 Workshop 第二堂

**注意事項**：請提早 10 分鐘到場`;

type BasicInfoFieldsProps = {
  mode: "create" | "edit";
  form: UseEventFormReturn;
};

/** 基本資訊欄位：活動類型／標題／描述／封面／時間／地點（create 與 edit 共用） */
export function BasicInfoFields({ mode, form }: BasicInfoFieldsProps) {
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
    openDrawer,
  } = form;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("write");
  const coverSrc = previewUrl || coverUrl || "";

  // 切換活動類型：create 模式會以新範本覆蓋販售項目（需確認）；edit 模式僅變更類型
  const handleTypeChange = (next: EventType) => {
    // Radix Select 的隱藏 native select 可能被外部 change 事件（如瀏覽器 autofill）
    // 以空字串觸發 onValueChange，須擋掉非法值以免蓋掉已載入的類型
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
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="eventType">活動類型</Label>
        {mode === "create" ? (
          <SegmentedToggle
            fullWidth
            size="md"
            value={type}
            onChange={(v) => handleTypeChange(v as EventType)}
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
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
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">活動描述</Label>
          <SegmentedToggle
            value={descriptionTab}
            onChange={setDescriptionTab}
            aria-label="活動描述編輯模式"
            options={[
              { value: "write", label: "編輯" },
              { value: "preview", label: "預覽" },
            ]}
          />
        </div>
        {descriptionTab === "write" ? (
          <textarea
            id="description"
            placeholder={DESCRIPTION_PLACEHOLDER}
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] focus:ring-2 focus:ring-brand/30 placeholder:text-gray-400 md:text-sm"
          />
        ) : (
          <div className="min-h-[18rem] w-full min-w-0 rounded-md bg-field px-3 py-2 text-sm leading-relaxed text-gray-800 shadow-xs">
            {description.trim() ? (
              <Markdown>{description}</Markdown>
            ) : (
              <p className="text-gray-400">還沒有輸入活動描述</p>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400">
          支援 Markdown：<code className="font-mono">## 小標題</code>、
          <code className="font-mono">**粗體**</code>、
          <code className="font-mono">- 項目</code>、
          <code className="font-mono">[文字](網址)</code>；直接換行也會保留。
        </p>
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
          <div className="rounded-lg border border-dashed border-gray-300 py-8 transition-colors hover:border-brand/50">
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
            value={startAt}
            onChange={(e) => handleStartAtChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endTime">結束時間</Label>
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
    </>
  );
}
