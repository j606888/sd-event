"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, Loader2, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { TicketGroupsCard } from "./TicketGroupsCard";
import { PriceTiersCard } from "./PriceTiersCard";
import { ExclusionRulesCard } from "./ExclusionRulesCard";
import { CouponsCard } from "./CouponsCard";
import { AttendeeFlagCard } from "./AttendeeFlagCard";
import { RegistrationPreview } from "./RegistrationPreview";
import type { UseEventFormReturn } from "@/hooks/use-event-form";
import { useReadOnly } from "@/hooks/use-session";

type TicketSettingsProps = {
  mode: "create" | "edit";
  form: UseEventFormReturn;
};

/** 依 mode 與自動儲存狀態顯示的儲存提示 chip */
function AutoSaveChip({ mode, form }: TicketSettingsProps) {
  const { autoSaveStatus, saveError } = form;
  const t = useTranslations("tickets.settings");
  const tCommon = useTranslations("common");
  if (mode === "create") {
    return (
      <span className="text-xs text-gray-400">
        {t("createModeHint")}
      </span>
    );
  }
  if (saveError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
        {t("saveFailed")}
      </span>
    );
  }
  if (autoSaveStatus === "saving") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        <Loader2 className="size-3 animate-spin" />
        <span>{tCommon("saving")}</span>
      </span>
    );
  }
  if (autoSaveStatus === "saved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
        <Check className="size-3" />
        <span>{t("autoSaved")}</span>
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400">{t("autoSaveHint")}</span>
  );
}

/**
 * 票券設定分頁：左側編輯卡片（票券內容／票價時段／折扣碼／進階（互斥規則＋金額計算）），
 * 右側報名頁即時預覽（桌機 sticky 欄；手機收進抽屜）。
 */
export function TicketSettings({ mode, form }: TicketSettingsProps) {
  const { groups, autoCalcAmount, setAutoCalcAmount, purchaseItems, priceTiers } = form;
  const readOnly = useReadOnly();
  const t = useTranslations("tickets");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 結構變動（區塊／票券／時段增減）時重置預覽的選取狀態，避免殘留失效選取
  const previewKey = `${groups.length}-${purchaseItems.length}-${priceTiers.length}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        {readOnly ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            {t("settings.readOnly")}
          </span>
        ) : (
          <AutoSaveChip mode={mode} form={form} />
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-8">
        {/* 左欄：整欄是一張白卡，各設定區塊在卡內以髮絲線分隔 */}
        {/* 此頁為即時自動儲存，唯讀時直接停用整欄互動（寫入本來也會被擋下） */}
        <div
          className={`surface-card flex flex-col divide-y divide-hairline px-4 py-5 sm:px-6 ${
            readOnly ? "pointer-events-none opacity-60" : ""
          }`}
          aria-disabled={readOnly || undefined}
        >
          {/* 票價依賴時段，所以先設時段再設票券 —— 避免「先填了金額才發現要分時段」 */}
          <PriceTiersCard form={form} />
          <TicketGroupsCard form={form} />
          <CouponsCard form={form} />
          <AttendeeFlagCard form={form} />

          {/* 進階：互斥規則＋金額計算（使用區塊時金額一律自動計算） */}
          <div className="py-5">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center gap-2 text-left cursor-pointer"
            >
              <Settings2 className="size-4 shrink-0 text-gray-400" />
              <span className="flex-1 text-sm font-semibold text-ink">{t("settings.advanced")}</span>
              <ChevronDown
                className={`size-4 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${
                  advancedOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {advancedOpen && (
              <div className="flex flex-col gap-5 pt-3">
                <ExclusionRulesCard form={form} />
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t("settings.amountCalc")}</Label>
                  {groups.length > 0 ? (
                    <p className="text-xs text-gray-500">
                      {t("settings.amountCalcWithGroups")}
                    </p>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!autoCalcAmount}
                        onChange={(e) => setAutoCalcAmount(!e.target.checked)}
                        className="size-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">
                        {t("settings.manualAmount")}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 桌機：右欄 sticky 預覽 */}
        <div className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <RegistrationPreview key={previewKey} form={form} />
        </div>
      </div>

      {/* 手機：固定按鈕開預覽抽屜 */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-20 right-4 z-20 flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-ink/90 lg:hidden"
      >
        <Eye className="size-4" />
        <span>{t("settings.previewButton")}</span>
      </button>
      {previewOpen && (
        <Drawer open onClose={() => setPreviewOpen(false)} title={t("preview.title")}>
          <RegistrationPreview key={previewKey} form={form} />
        </Drawer>
      )}
    </div>
  );
}
