"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { UseEventFormReturn } from "@/hooks/use-event-form";

/**
 * 參加者勾選項目：活動層級的單一勾選框（如「參加伸展台比賽」），報名表每位參加者各一個。
 * 票券可在編輯視窗設定「至少勾選幾位」。
 */
export function AttendeeFlagCard({ form }: { form: UseEventFormReturn }) {
  const { attendeeFlagLabel, setAttendeeFlagLabel, saveAttendeeFlagLabel } = form;
  const t = useTranslations("tickets.flag");

  return (
    <div className="flex flex-col gap-2 py-5 first:pt-0">
      <h3 className="font-display text-sm font-bold text-ink">{t("title")}</h3>
      <p className="text-xs text-gray-500">
        {t("description")}
      </p>
      <Input
        placeholder={t("placeholder")}
        value={attendeeFlagLabel}
        onChange={(e) => setAttendeeFlagLabel(e.target.value)}
        onBlur={() => saveAttendeeFlagLabel()}
        maxLength={40}
      />
    </div>
  );
}
