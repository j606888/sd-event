"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedToggle } from "@/components/ui/segmented";

export type RefundMethod = "Bank Transfer" | "Line Pay" | "Cash";

export type RefundInput = {
  method: RefundMethod;
  note: string;
  notify: boolean;
};

type RefundDrawerProps = {
  open: boolean;
  onClose: () => void;
  contactName: string;
  contactEmail: string | null;
  attendeeCount: number;
  totalAmount: number;
  onConfirm: (input: RefundInput) => Promise<void>;
};

const METHOD_OPTIONS: { value: RefundMethod; label: string }[] = [
  { value: "Bank Transfer", label: "銀行轉帳" },
  { value: "Line Pay", label: "LINE Pay" },
  { value: "Cash", label: "現金" },
];

/**
 * 標記為已退款（全額）。系統不會轉帳，主辦退完錢後回來記一筆。
 * 版型照 ConfirmActionDrawer，多了退款方式、備註與是否寄信。
 */
export function RefundDrawer({
  open,
  onClose,
  contactName,
  contactEmail,
  attendeeCount,
  totalAmount,
  onConfirm,
}: RefundDrawerProps) {
  const [method, setMethod] = useState<RefundMethod>("Bank Transfer");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打開都從乾淨的表單開始
  useEffect(() => {
    if (!open) return;
    setMethod("Bank Transfer");
    setNote("");
    setNotify(true);
    setError(null);
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ method, note, notify: notify && !!contactEmail });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`把${contactName}標記為已退款？`}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-gray-600">
          這只是記錄，系統不會幫你轉帳。請先把錢退給對方，再回來按確認。
        </p>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-field px-3 py-2.5 text-sm">
          <span className="text-gray-600">
            全額退款 · {attendeeCount} 人
          </span>
          <span className="font-display text-lg font-bold tabular-nums text-ink">
            NT${totalAmount.toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-ink">退款方式</span>
          <SegmentedToggle
            value={method}
            onChange={setMethod}
            options={METHOD_OPTIONS}
            size="md"
            fullWidth
            aria-label="退款方式"
          />
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-bold text-ink">
            備註 <span className="font-normal text-muted-ink">（選填，只有主辦看得到）</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="例如：臨時有事無法參加，全額退款"
            className="w-full min-w-0 resize-none rounded-md border-0 bg-field px-3 py-2 text-base shadow-xs outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 md:text-sm"
          />
        </label>

        {contactEmail && (
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 size-4 accent-brand-strong"
            />
            <span>寄退款通知 Email 給 {contactEmail}</span>
          </label>
        )}

        <ul className="space-y-1 border-t border-hairline pt-4 text-[13px] leading-relaxed text-muted-ink">
          <li>· 不再計入報名人數、L/F 與已入帳金額</li>
          <li>· QR 憑證失效，掃碼時會顯示「已退款」</li>
          <li>· 之後可以從報名明細「撤銷退款」</li>
        </ul>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            type="button"
            className="flex-1 bg-leader text-white hover:bg-leader/90"
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? "處理中…" : `確認已退款 NT$${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
