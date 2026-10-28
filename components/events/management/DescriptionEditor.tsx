"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented";
import { Markdown } from "@/components/ui/markdown";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

/** 上傳中的暫存標記；上傳完成後再把它換成真正的網址 */
let placeholderSeq = 0;

type DescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /** 桌機雙欄版面用：編輯區撐滿所在卡片剩餘的高度，長描述不用在小框裡捲 */
  tall?: boolean;
};

/**
 * 活動描述的 Markdown 編輯器。
 *
 * 圖片採「先插入佔位、上傳完再換掉網址」的做法（同 GitHub 的輸入框）：
 * 上傳期間主辦方可以繼續打字，回填時用唯一的 token 定位，不會因為游標移動而插錯地方。
 */
export function DescriptionEditor({ value, onChange, tall = false }: DescriptionEditorProps) {
  const t = useTranslations("eventForm");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 連續上傳時，下一次取代不能等 re-render 才拿到最新內容
  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = (next: string) => {
    valueRef.current = next;
    onChange(next);
  };

  const { startUpload } = useUploadThing("descriptionImage");

  /** 在游標處插入文字，並讓插入的片段自成一行 */
  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const current = valueRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n" : "";
    const head = `${before}${prefix}${text}${suffix}`;
    setValue(`${head}${after}`);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(head.length, head.length);
    });
  };

  const uploadImages = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    if (images.some((f) => f.size > MAX_IMAGE_SIZE)) {
      setError(t("errors.imageTooLarge"));
      return;
    }
    setError(null);

    const tokens = images.map(() => `uploading-${++placeholderSeq}`);
    insertAtCursor(
      images.map((file, i) => `![${file.name}](${tokens[i]})`).join("\n")
    );

    const clearPlaceholders = () => {
      let next = valueRef.current;
      for (const token of tokens) {
        next = next.replace(new RegExp(`!\\[[^\\]]*\\]\\(${token}\\)\\n?`), "");
      }
      setValue(next);
    };

    setUploadingCount((c) => c + 1);
    try {
      const res = await startUpload(images);
      if (!res || res.length !== images.length) {
        throw new Error("上傳結果不完整");
      }
      let next = valueRef.current;
      res.forEach((file, i) => {
        const url = "url" in file ? file.url : (file as { ufsUrl?: string }).ufsUrl;
        if (!url) throw new Error("無法取得上傳後的圖片網址");
        next = next.replace(`(${tokens[i]})`, `(${url})`);
      });
      setValue(next);
    } catch (err) {
      console.error("Description image upload error:", err);
      clearPlaceholders();
      setError(t("description.uploadFailed"));
    } finally {
      setUploadingCount((c) => c - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;
    e.preventDefault();
    uploadImages(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setDragging(false);
    if (files.length === 0) return;
    e.preventDefault();
    uploadImages(files);
  };

  return (
    <div className={cn("flex flex-col gap-2", tall && "min-h-0 flex-1")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="description">{t("description.label")}</Label>
        <SegmentedToggle
          value={tab}
          onChange={setTab}
          aria-label={t("description.modeLabel")}
          options={[
            { value: "write", label: t("description.write") },
            { value: "preview", label: t("description.preview") },
          ]}
        />
      </div>
      {tab === "write" ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCount > 0}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink disabled:opacity-50"
            >
              {uploadingCount > 0 ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              <span>{uploadingCount > 0 ? t("description.uploading") : t("description.insertImage")}</span>
            </button>
            <span className="text-xs text-gray-400">{t("description.dropHint")}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              uploadImages(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <textarea
            id="description"
            ref={textareaRef}
            placeholder={t("description.placeholder")}
            rows={12}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDragging(true);
              }
            }}
            onDragLeave={() => setDragging(false)}
            className={cn(
              "w-full min-w-0 rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] focus:ring-2 focus:ring-brand/30 placeholder:text-gray-400 md:text-sm",
              tall && "min-h-[20rem] flex-1 resize-none",
              dragging && "ring-2 ring-brand/50"
            )}
          />
        </>
      ) : (
        <div
          className={cn(
            "w-full min-w-0 rounded-md bg-field px-3 py-2 text-sm leading-relaxed text-gray-800 shadow-xs",
            tall ? "min-h-[20rem] flex-1" : "min-h-[18rem]"
          )}
        >
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-gray-400">{t("description.empty")}</p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-gray-400">
        {t.rich("description.markdownHelp", {
          code: (chunks) => <code className="font-mono">{chunks}</code>,
        })}
      </p>
    </div>
  );
}
