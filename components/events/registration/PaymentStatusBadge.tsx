"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type KnownPaymentStatus = "pending" | "reported" | "confirmed" | "rejected" | "refunded";
type PaymentStatus = KnownPaymentStatus | string;

const STATUS_CONFIG: Record<KnownPaymentStatus, { text: string; dot: string }> = {
  pending: { text: "text-muted-ink", dot: "bg-gray-300" },
  reported: { text: "text-butter-ink", dot: "bg-butter" },
  confirmed: { text: "text-brand-strong", dot: "bg-brand" },
  rejected: { text: "text-red-700", dot: "bg-red-400" },
  // 空心圈：與「未付款」的灰點靠形狀區分，不只靠顏色
  refunded: { text: "text-leader", dot: "border-2 border-leader" },
};

function isKnownStatus(status: string): status is KnownPaymentStatus {
  return Object.hasOwn(STATUS_CONFIG, status);
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const t = useTranslations("enums.paymentStatus");
  const key = isKnownStatus(status) ? status : "pending";
  const { text, dot } = STATUS_CONFIG[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold",
        text,
        className
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <span>{t(key)}</span>
    </span>
  );
}
