"use client";

import { Clock } from "lucide-react";

export function ReportedPaymentHeader() {
  return (
    <div className="p-4 text-center">
      <div
        className="px-6 py-8 rounded-2xl border border-amber-300 shadow-sm"
        style={{
          background:
            "linear-gradient(180deg, #FFFBEB 0%, #FFFDF2 100%)",
        }}
      >
        {/* 圖示區域：增加層次感與柔和陰影 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-200/50 flex items-center justify-center animate-pulse">
              <div className="w-14 h-14 rounded-full bg-amber-400 shadow-inner flex items-center justify-center">
                <Clock className="w-8 h-8 text-white stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>

        {/* 文字區域：優化級距與顏色 */}
        <h1 className="text-2xl font-extrabold text-amber-950 mb-3 tracking-tight">
          付款資訊已回報
        </h1>
        
        <div className="space-y-1 mb-6">
          <p className="text-[15px] font-medium text-amber-900/70">
            我們已收到您回報的付款資訊
          </p>
          <p className="text-[14px] text-amber-900/50">
            主辦方將盡快為您確認，請稍候
          </p>
        </div>

        {/* Tag 優化：白底、琥珀色文字、動態小點 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-amber-200 rounded-full shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-sm font-bold text-amber-700">待主辦方確認</span>
        </div>
      </div>
    </div>
  );
}