"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

type ConfirmActionDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 說明「按下去會發生什麼」，不要只是「確定嗎？」 */
  description: string;
  /** 選填的重點摘要（例如姓名與金額），放在說明下方的淺底列 */
  summary?: React.ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

/**
 * 取代原生 window.confirm 的確認 Drawer。
 *
 * `components/ui/drawer.tsx` 沒有 footer slot，所以 footer 照專案既有慣例
 * （RegistrationEditDrawer / WalkInDrawer）當作 children 的最後一個 block。
 */
export function ConfirmActionDrawer({
  open,
  onClose,
  title,
  description,
  summary,
  confirmLabel,
  pendingLabel,
  destructive = false,
  onConfirm,
}: ConfirmActionDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重新開啟時清掉上一次的錯誤，否則會看到已經不成立的訊息
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-600">{description}</p>

        {summary && (
          <div className="rounded-lg bg-field px-3 py-2.5 text-sm">{summary}</div>
        )}

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
            className={
              destructive
                ? "flex-1 bg-red-600 text-white hover:bg-red-700"
                : "flex-1 bg-brand text-white hover:bg-brand-hover"
            }
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
