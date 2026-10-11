"use client";

import { Input } from "@/components/ui/input";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/**
 * 參加者勾選項目：活動層級的單一勾選框（如「參加伸展台比賽」），報名表每位參加者各一個。
 * 票券可在編輯視窗設定「至少勾選幾位」。
 */
export function AttendeeFlagCard({ form }: { form: UseEventFormReturn }) {
  const { attendeeFlagLabel, setAttendeeFlagLabel, saveAttendeeFlagLabel } = form;

  return (
    <div className="flex flex-col gap-2 py-5 first:pt-0">
      <h3 className="font-display text-sm font-bold text-ink">參加者勾選項目（選填）</h3>
      <p className="text-xs text-gray-500">
        填寫後，報名表每位參加者會多一個勾選框，例如「參加伸展台比賽」。票券可在編輯時設定「至少要勾選幾位」。留空＝不顯示。
      </p>
      <Input
        placeholder="例如：參加伸展台比賽"
        value={attendeeFlagLabel}
        onChange={(e) => setAttendeeFlagLabel(e.target.value)}
        onBlur={() => saveAttendeeFlagLabel()}
        maxLength={40}
      />
    </div>
  );
}
