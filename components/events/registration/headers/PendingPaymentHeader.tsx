"use client";

import { Check, Rat, AlertCircle } from "lucide-react";

export function PendingPaymentHeader() {
  const brandIndigo = "#4F46E5"; // 使用稍深一點的靛藍色來代表「待辦事項」

  return (
    <div className="p-4 text-center">
      <div
        className="px-6 py-8 rounded-2xl border border-slate-200 shadow-sm"
        style={{
          background:
            "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)", // 乾淨的冷灰色調
        }}
      >
        {/* 圖示區域：強調「完成了一半」的感覺 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* 外圈光暈 */}
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
              {/* 核心圓圈 */}
              <div className="w-14 h-14 rounded-full bg-slate-600 shadow-lg flex items-center justify-center relative">
                <Check className="w-8 h-8 text-white stroke-[3]" />
                {/* 右下角的小驚嘆號，提示動作未完成 */}
                <div className="absolute -right-1 -top-1 bg-amber-500 rounded-full p-0.5 border-2 border-white">
                  <AlertCircle className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文字區域 */}
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
          報名資訊已送出！
        </h1>
        
        <div className="space-y-1 mb-6">
          <p className="text-[15px] font-medium text-slate-600">
            目前尚未完成付款
          </p>
          <p className="text-[14px] text-slate-400">
            請於期限內完成付款以保留名額
          </p>
        </div>

        {/* 狀態 Tag：深灰色或中性色，代表這是一個「掛起」的狀態 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-700 rounded-full shadow-md shadow-slate-200">
          <Rat className="w-4 h-4 text-slate-200" />
          <span className="text-sm font-bold text-white">尚未付款</span>
        </div>
      </div>
    </div>
  );
}