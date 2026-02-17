"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Copy, Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUploadThing } from "@/lib/uploadthing";

type BankInfo = {
  id: number;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type Organizer = {
  id: number;
  name: string;
  lineId: string | null;
};

type ReportPaymentPageProps = {
  registrationKey: string;
  bankInfo: BankInfo | null;
  organizer: Organizer | null;
};

export function ReportPaymentPage({
  registrationKey,
  bankInfo,
  organizer,
}: ReportPaymentPageProps) {
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
      setError("上傳失敗，請重試");
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
  const [error, setError] = useState<string | null>(null);

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
      setError("請選擇圖片檔案");
      return;
    }

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      setError("圖片大小不能超過 4MB");
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
      setError("請至少提供轉帳截圖或銀行末五碼");
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
            throw new Error("上傳失敗");
          }
          const first = uploadResult[0];
          finalScreenshotUrl =
            first &&
            ("url" in first
              ? first.url
              : (first as { ufsUrl?: string }).ufsUrl) ||
            null;
          if (!finalScreenshotUrl) {
            throw new Error("無法取得上傳後的圖片網址");
          }
          setPaymentScreenshotUrl(finalScreenshotUrl);
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          setError(uploadError instanceof Error ? uploadError.message : "上傳失敗，請重試");
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
        setError(data.error || "送出失敗，請稍後再試");
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
      setError("網路錯誤，請稍後再試");
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900">回報付款資訊</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Bank Account Information */}
        {bankInfo && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">匯款帳號</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-500">銀行</span>
                  <span className="ml-2 text-gray-900">
                    {bankInfo.bankName} {bankInfo.bankCode}
                  </span>
                </div>
              </div>
              {bankInfo.account && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">帳號</span>
                    <span className="ml-2 text-gray-900">{bankInfo.account}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(bankInfo.account!, "bank")}
                    className="h-8 text-[#5295BC] border-[#5295BC] hover:bg-[#5295BC]/10"
                  >
                    {copiedText === "bank" ? (
                      <>
                        <Check className="w-3 h-3" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        複製帳號
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINE Friend Information */}
        {organizer?.lineId && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Line 好友</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">LINE ID</span>
                <span className="ml-2 text-sm text-gray-900">{organizer.lineId}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(organizer.lineId!, "line")}
                className="h-8 text-[#5295BC] border-[#5295BC] hover:bg-[#5295BC]/10"
              >
                {copiedText === "line" ? (
                  <>
                    <Check className="w-3 h-3" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    複製 ID
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Transfer Screenshot Upload */}
        <div className="space-y-3">
          <Label>轉帳截圖</Label>
          {previewUrl || paymentScreenshotUrl ? (
            <div className="relative">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={previewUrl || paymentScreenshotUrl || ""}
                  alt="轉帳截圖"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="移除截圖"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 cursor-pointer hover:border-[#5295BC] transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">點擊選擇圖片或拖放圖片到此處</span>
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
          <Label htmlFor="paymentNote">銀行末五碼或其他訊息</Label>
          <textarea
            id="paymentNote"
            placeholder="輸入訊息"
            rows={4}
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            className="w-full min-w-0 rounded-md border-0 bg-[#F3F5F7] px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 md:text-sm resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
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
          className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
        >
          {uploading || isUploading
            ? "上傳中…"
            : submitting
              ? "送出中…"
              : "送出"}
        </Button>
      </div>
    </div>
  );
}
