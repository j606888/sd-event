"use client";

import { Check } from "lucide-react";

export function ConfirmedPaymentHeader() {
  const brandBlue = "#5295BC";

  return (
    <div className="p-4 text-center">
      <div
        className="px-6 py-8 rounded-2xl border border-blue-200 shadow-sm"
        style={{
          background:
            "linear-gradient(180deg, #F0F7FA 0%, #FFFFFF 100%)", // 極淺的藍色到純白漸層
        }}
      >
        {/* 圖示區域：核心品牌藍 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* 外圈光暈 */}
            <div className="w-20 h-20 rounded-full bg-[#5295BC]/10 flex items-center justify-center">
              {/* 核心圓圈 */}
              <div 
                className="w-14 h-14 rounded-full shadow-lg shadow-blue-100 flex items-center justify-center"
                style={{ backgroundColor: brandBlue }}
              >
                <Check className="w-8 h-8 text-white stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        {/* 文字區域 */}
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
          付款確認完成！
        </h1>
        
        <div className="space-y-1 mb-6">
          <p className="text-[15px] font-medium text-slate-600">
            主辦方已確認收到款項
          </p>
          <p className="text-[14px] text-slate-400">
            請於活動當天出示入場憑證
          </p>
        </div>

        {/* 狀態 Tag：使用品牌藍實心色塊 */}
        <div 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full shadow-md shadow-blue-50"
          style={{ backgroundColor: brandBlue }}
        >
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          <span className="text-sm font-bold text-white">報名成功</span>
        </div>
      </div>
    </div>
  );
}