"use client";

import { useState } from "react";
import { Search, Cloud, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

type Registration = {
  id: number;
  registrationKey: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  totalAmount: number;
  paymentStatus: "pending" | "reported" | "confirmed" | "rejected";
  attendeeCount: number;
  createdAt: string;
};

type RegistrationsListProps = {
  registrations: Registration[];
  onSelect: (registrationId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

function getStatusBadge(status: Registration["paymentStatus"]) {
  switch (status) {
    case "pending":
      return {
        icon: Cloud,
        label: "尚未付款",
        className: "bg-gray-100 text-gray-700",
      };
    case "reported":
      return {
        icon: Clock,
        label: "待確認",
        className: "bg-yellow-100 text-yellow-800",
      };
    case "confirmed":
      return {
        icon: CheckCircle2,
        label: "已完成",
        className: "bg-green-100 text-green-700",
      };
    case "rejected":
      return {
        icon: Clock,
        label: "已拒絕",
        className: "bg-red-100 text-red-700",
      };
    default:
      return {
        icon: Cloud,
        label: "未知",
        className: "bg-gray-100 text-gray-700",
      };
  }
}

export function RegistrationsList({
  registrations,
  onSelect,
  searchQuery,
  onSearchChange,
}: RegistrationsListProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="搜尋名稱、銀行末五碼、Line ID"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
          尚無報名記錄
        </div>
      ) : (
        <div className="space-y-2">
          {registrations.map((reg) => {
            const statusBadge = getStatusBadge(reg.paymentStatus);
            const StatusIcon = statusBadge.icon;

            return (
              <button
                key={reg.id}
                onClick={() => onSelect(reg.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">
                      {reg.contactName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {reg.attendeeCount}人 • NT ${reg.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusBadge.label}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
