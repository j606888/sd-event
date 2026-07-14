"use client";

import { Cloud, Clock, CheckCircle2, X } from "lucide-react";

type PaymentStatus = "pending" | "reported" | "confirmed" | "rejected" | string;

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  pending: { icon: Cloud, label: "尚未付款", className: "bg-gray-100 text-gray-700" },
  reported: { icon: Clock, label: "待確認", className: "bg-amber-100 text-amber-700" },
  confirmed: { icon: CheckCircle2, label: "已確認收款", className: "bg-green-100 text-green-700" },
  rejected: { icon: X, label: "已拒絕", className: "bg-red-100 text-red-700" },
};

const DEFAULT_CONFIG = STATUS_CONFIG.pending;

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { icon: Icon, label, className } = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}
