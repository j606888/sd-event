"use client";

import { Check, Rat } from "lucide-react";

export function PendingPaymentHeader() {
  return (
    <div className="text-center p-4">
      <div
        className="px-4 py-4 rounded-lg"
        style={{
          background:
            "linear-gradient(180deg, rgba(82, 149, 188, 0.5) 0%, rgba(82, 149, 188, 0.1) 100%)",
        }}
      >
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-[#5295BC]/30 flex items-center justify-center">
            <div className="w-15 h-15 rounded-full bg-[#5295BC] flex items-center justify-center">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>
        <h1 className="text-[20px] font-bold text-gray-900 mb-1">報名成功!</h1>
        <p className="text-[15px] text-gray-600">目前尚未完成付款</p>
        <p className="text-[15px] text-gray-600 mb-3">
          請於期限內完成付款以保留名額
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 rounded-full text-sm text-white">
          <Rat className="w-4 h-4" />
          <span>尚未付款</span>
        </div>
      </div>
    </div>
  );
}
