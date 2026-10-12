"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lineAddFriendUrl, validateLineIdInput } from "@/lib/line";

type LinePayeeFieldsProps = {
  label: string;
  lineId: string;
  onLabelChange: (value: string) => void;
  onLineIdChange: (value: string) => void;
};

/** LINE 付款好友表單欄位（名稱／備註 + LINE ID 或連結 + 教學），常用資訊頁與活動表單抽屜共用 */
export function LinePayeeFields({
  label,
  lineId,
  onLabelChange,
  onLineIdChange,
}: LinePayeeFieldsProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const trimmed = lineId.trim();
  const url = trimmed && !validateLineIdInput(trimmed) ? lineAddFriendUrl(trimmed) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="line-payee-label">名稱／備註 *</Label>
        <Input
          id="line-payee-label"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="例如：小明（收 LINE Pay）"
        />
        <p className="text-xs text-gray-500">只有主辦方看得到，用來區分不同的收款人</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="line-payee-id">LINE ID 或加好友連結 *</Label>
        <Input
          id="line-payee-id"
          value={lineId}
          onChange={(e) => onLineIdChange(e.target.value)}
          placeholder="xiaoming 或 https://line.me/ti/p/..."
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-xs text-brand-strong hover:underline"
          >
            <ExternalLink className="size-3" />
            測試連結：開啟看看是不是加到正確的人
          </a>
        )}
      </div>

      <div className="rounded-lg border border-hairline bg-gray-50">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-gray-700"
          aria-expanded={helpOpen}
        >
          如何取得 LINE ID 或加好友連結？
          <ChevronDown className={`size-4 transition-transform ${helpOpen ? "rotate-180" : ""}`} />
        </button>
        {helpOpen && (
          <div className="space-y-4 px-3 pb-3 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-800">方法一：加好友連結（推薦）</p>
              <p className="mb-1 text-xs text-gray-500">不用開放 ID 搜尋，參加者點了就能加好友</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li>打開 LINE，到「主頁」</li>
                <li>點右上角的「加入好友」圖示</li>
                <li>選「QR 碼」，再點「複製連結」</li>
                <li>貼到上面的欄位</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-gray-800">方法二：LINE ID</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li>LINE「主頁」→ 右上角齒輪「設定」→「個人檔案」→「ID」</li>
                <li>還沒設定的話可以在這裡建立（設定後無法修改）</li>
                <li>到「設定」→「隱私設定」，開啟「允許利用 ID 加入好友」，參加者才搜尋得到</li>
              </ol>
              <p className="mt-1 text-xs text-gray-500">官方帳號請輸入 @ 開頭的 ID，例如 @abc1234</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
