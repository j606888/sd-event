"use client";

import { Check } from "lucide-react";

export function ConfirmedPaymentHeader() {
  return (
    <div className="p-4 text-center">
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">付款確認完成!</h1>
        <p className="text-[15px] text-gray-600">
          主辦方已確認收到款項,
        </p>
        <p className="text-[15px] text-gray-600">
          請於活動當天出示入場憑證
        </p>
      </div>
    </div>
  );
}
