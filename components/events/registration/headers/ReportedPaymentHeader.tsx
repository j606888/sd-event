"use client";

import { Clock } from "lucide-react";

export function ReportedPaymentHeader() {
  return (
    <div className="p-4 text-center">
         <div
        className="px-4 py-4 rounded-lg"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 215, 0, 0.5) 0%, rgba(255, 215, 0, 0.1) 100%)",
        }}
      >
      <div className="flex justify-center mb-4">
      <div className="w-20 h-20 rounded-full bg-[#FFD700]/40 flex items-center justify-center">
            <div className="w-15 h-15 rounded-full bg-[#FFD700] flex items-center justify-center">
              <Clock className="w-10 h-10 text-white" />
            </div>
          </div>
       
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">付款資訊已回報</h1>
      <p className="text-[15px] text-gray-600">我們已收到您回報的付款資訊</p>
      <p className="text-[15px] text-gray-600 mb-4">
        主辦方將盡快為您確認，請稍候
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full text-sm text-yellow-800">
        <Clock className="w-4 h-4" />
        <span>待主辦方確認</span>
      </div>
      </div>

    </div>
  );
}
