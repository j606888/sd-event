"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { siLine } from "simple-icons";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { lineAddFriendUrl, lineIdForDisplay } from "@/lib/line";
import type { EventLinePayee } from "@/types/event";

type LinePayeeCardProps = {
  linePayee: EventLinePayee;
  /** 外框樣式：付款步驟用灰底卡片，回報頁用無底 */
  className?: string;
};

/**
 * 參加者付款時看到的 LINE 好友區塊：手機直接點按鈕加好友；
 * 電腦版另顯示 QR code 讓參加者用手機掃，並附 LINE ID 方便手動搜尋。
 */
export function LinePayeeCard({ linePayee, className = "" }: LinePayeeCardProps) {
  const url = lineAddFriendUrl(linePayee.lineId);
  const displayId = lineIdForDisplay(linePayee.lineId);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 240, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [url]);

  if (!url) return null;

  const handleCopy = async () => {
    if (!displayId) return;
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-semibold text-gray-900">LINE 付款</h3>
      <p className="text-sm text-gray-600">
        加入好友後，透過 LINE Pay / LINE 轉帳付款，並傳送付款截圖。
      </p>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#06C755] px-4 text-sm font-medium text-white hover:bg-[#05b14c]"
          >
            <SimpleIcon icon={siLine} size={18} />
            加 LINE 好友
          </a>
          {displayId && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">LINE ID</span>
              <span className="font-mono text-gray-900">{displayId}</span>
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 px-2">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "已複製" : "複製"}</span>
              </Button>
            </div>
          )}
        </div>
        {qrUrl && (
          <div className="hidden shrink-0 text-center sm:block">
            <Image
              src={qrUrl}
              alt="LINE 加好友 QR code"
              width={112}
              height={112}
              unoptimized
              className="rounded border border-gray-200 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">用手機掃描</p>
          </div>
        )}
      </div>
    </div>
  );
}
