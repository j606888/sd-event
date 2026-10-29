"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Copy, Check, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PublicLanguageBar } from "@/components/layout/PublicLanguageBar";
import { useUploadThing } from "@/lib/uploadthing";
import type { EventLinePayee } from "@/types/event";
import { LinePayeeCard } from "./LinePayeeCard";

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type ReportErrorCode =
  | "uploadFailedRetry"
  | "notImage"
  | "tooLarge"
  | "proofRequired"
  | "uploadFailed"
  | "noUploadUrl"
  | "submitFailed"
  | "network";

/**
 * 自己判斷的錯誤存代碼、render 時才翻（切換語言會跟著換）；
 * 伺服器或上傳套件給的訊息原樣顯示
 */
type ReportError = { code: ReportErrorCode } | { text: string };

/** 上傳步驟自己丟出的錯誤，帶翻譯代碼 */
class UploadStepError extends Error {
  constructor(readonly code: ReportErrorCode) {
    super(code);
  }
}

type ReportPaymentPageProps = {
  registrationKey: string;
  bankInfo: BankInfo | null;
  linePayee: EventLinePayee | null;
};

export function ReportPaymentPage({
  registrationKey,
  bankInfo,
  linePayee,
}: ReportPaymentPageProps) {
  const t = useTranslations("myRegistration.reportPayment");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { startUpload, isUploading } = useUploadThing("paymentScreenshot", {
    onClientUploadComplete: (res) => {
      const first = res?.[0];
      const url =
        first &&
        ("url" in first
          ? first.url
          : (first as { ufsUrl?: string }).ufsUrl);
      if (url) {
        setPaymentScreenshotUrl(url);
        setUploading(false);
      }
    },
    onUploadError: (err) => {
      console.error("Upload error:", err);
      setError({ code: "uploadFailedRetry" });
      setUploading(false);
      setSubmitting(false);
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<ReportError | null>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError({ code: "notImage" });
      return;
    }

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      setError({ code: "tooLarge" });
      return;
    }

    setError(null);

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPaymentScreenshotUrl(null);
    // Reset file input
    const fileInput = document.getElementById("screenshot-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };


  const handleSubmit = async () => {
    if (!selectedFile && !paymentScreenshotUrl && !paymentNote.trim()) {
      setError({ code: "proofRequired" });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let finalScreenshotUrl = paymentScreenshotUrl;

      // Upload file if a new file is selected
      if (selectedFile && !paymentScreenshotUrl) {
        setUploading(true);
        try {
          const uploadResult = await startUpload([selectedFile]);
          if (!uploadResult || uploadResult.length === 0) {
            throw new UploadStepError("uploadFailed");
          }
          const first = uploadResult[0];
          finalScreenshotUrl =
            first &&
            ("url" in first
              ? first.url
              : (first as { ufsUrl?: string }).ufsUrl) ||
            null;
          if (!finalScreenshotUrl) {
            throw new UploadStepError("noUploadUrl");
          }
          setPaymentScreenshotUrl(finalScreenshotUrl);
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          setError(
            uploadError instanceof UploadStepError
              ? { code: uploadError.code }
              : uploadError instanceof Error
                ? { text: uploadError.message }
                : { code: "uploadFailedRetry" }
          );
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const response = await fetch(`/api/registrations/${registrationKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentScreenshotUrl: finalScreenshotUrl || null,
          paymentNote: paymentNote.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ? { text: data.error } : { code: "submitFailed" });
        setSubmitting(false);
        return;
      }

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Redirect to registration success page immediately
      router.push(`/registration-success/${registrationKey}`);
    } catch (error) {
      console.error("Submit error:", error);
      setError({ code: "network" });
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper p-4 sm:py-10">
      <PublicLanguageBar />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">{t("title")}</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Bank Account Information */}
        {bankInfo && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">{t("bankHeading")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-500">{t("bank")}</span>
                  <span className="ml-2 text-gray-900">
                    {`${bankInfo.bankName} ${bankInfo.bankCode}`}
                  </span>
                </div>
              </div>
              {bankInfo.account && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">{t("account")}</span>
                    <span className="ml-2 text-gray-900">{bankInfo.account}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(bankInfo.account!, "bank")}
                    className="h-8 text-brand-strong border-brand hover:bg-brand/10"
                  >
                    {copiedText === "bank" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === "bank" ? tCommon("copied") : t("copyAccount")}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINE Friend Information */}
        {linePayee && <LinePayeeCard linePayee={linePayee} />}

        {/* Transfer Screenshot Upload */}
        <div className="space-y-3">
          <Label>{t("screenshot")}</Label>
          {previewUrl || paymentScreenshotUrl ? (
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={previewUrl || paymentScreenshotUrl || ""}
                  alt={t("screenshot")}
                  fill
                  className="object-contain"
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label={t("removeScreenshot")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 cursor-pointer hover:border-brand transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">{t("dropzone")}</span>
              <input
                id="screenshot-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Additional Message */}
        <div className="space-y-3">
          <Label htmlFor="paymentNote">{t("noteLabel")}</Label>
          <textarea
            id="paymentNote"
            placeholder={t("notePlaceholder")}
            rows={4}
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 md:text-sm resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-500 text-center">
            {"code" in error ? t(`errors.${error.code}`) : error.text}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            uploading ||
            isUploading ||
            (!selectedFile && !paymentScreenshotUrl && !paymentNote.trim())
          }
          className="w-full bg-brand text-ink hover:bg-brand-hover h-12 text-base font-medium"
        >
          {uploading || isUploading
            ? t("uploading")
            : submitting
              ? t("submitting")
              : t("submit")}
        </Button>
      </div>
      </div>
    </div>
  );
}
