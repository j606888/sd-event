"use client";

import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "reported" | "confirmed" | "rejected" | "refunded" | string;

const STATUS_CONFIG: Record<string, { label: string; text: string; dot: string }> = {
  pending: { label: "未付款", text: "text-muted-ink", dot: "bg-gray-300" },
  reported: { label: "待確認收款", text: "text-butter-ink", dot: "bg-butter" },
  confirmed: { label: "已收款", text: "text-brand-strong", dot: "bg-brand" },
  rejected: { label: "已拒絕", text: "text-red-700", dot: "bg-red-400" },
  // 空心圈：與「未付款」的灰點靠形狀區分，不只靠顏色
  refunded: { label: "已退款", text: "text-leader", dot: "border-2 border-leader" },
};

const DEFAULT_CONFIG = STATUS_CONFIG.pending;

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const { label, text, dot } = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold",
        text,
        className
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
