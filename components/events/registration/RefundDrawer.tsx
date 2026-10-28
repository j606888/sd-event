"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const METHOD_OPTIONS: { value: RefundMethod; labelKey: "bankTransfer" | "linePay" | "cash" }[] = [
  { value: "Bank Transfer", labelKey: "bankTransfer" },
  { value: "Line Pay", labelKey: "linePay" },
  { value: "Cash", labelKey: "cash" },
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
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
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
      setError(e instanceof Error ? e.message : t("actionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={t("refund.title", { name: contactName })}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-gray-600">
          {t("refund.intro")}
        </p>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-field px-3 py-2.5 text-sm">
          <span className="text-gray-600">
            {t("refund.fullRefund", { count: attendeeCount })}
          </span>
          <span className="font-display text-lg font-bold tabular-nums text-ink">
            {`NT$${totalAmount.toLocaleString()}`}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-ink">{t("refund.method")}</span>
          <SegmentedToggle
            value={method}
            onChange={setMethod}
            options={METHOD_OPTIONS.map((o) => ({
              value: o.value,
              label: t(`refundMethod.${o.labelKey}`),
            }))}
            size="md"
            fullWidth
            aria-label={t("refund.method")}
          />
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-bold text-ink">
            <span>{t("refund.note")}</span>{" "}
            <span className="font-normal text-muted-ink">{t("refund.noteHint")}</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("refund.notePlaceholder")}
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
            <span>{t("refund.notify", { email: contactEmail })}</span>
          </label>
        )}

        <ul className="space-y-1 border-t border-hairline pt-4 text-[13px] leading-relaxed text-muted-ink">
          <li>{t("refund.effectNotCounted")}</li>
          <li>{t("refund.effectQrVoid")}</li>
          <li>{t("refund.effectUndo")}</li>
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
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1 bg-leader text-white hover:bg-leader/90"
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting
              ? tCommon("processing")
              : t("refund.confirm", { amount: totalAmount.toLocaleString() })}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
