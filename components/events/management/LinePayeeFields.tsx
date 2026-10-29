"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lineAddFriendUrl, lineIdInputError } from "@/lib/line";

type LinePayeeFieldsProps = {
  label: string;
  lineId: string;
  onLabelChange: (value: string) => void;
  onLineIdChange: (value: string) => void;
};

/** LINE 付款好友表單欄位（名稱／備註 + LINE ID 或連結 + 教學），常用資訊頁與活動表單抽屜共用 */
export function LinePayeeFields({
  label,
  lineId,
  onLabelChange,
  onLineIdChange,
}: LinePayeeFieldsProps) {
  const t = useTranslations("savedInfo.linePayee");
  const [helpOpen, setHelpOpen] = useState(false);
  const trimmed = lineId.trim();
  const url = trimmed && !lineIdInputError(trimmed) ? lineAddFriendUrl(trimmed) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="line-payee-label">{t("labelLabel")}</Label>
        <Input
          id="line-payee-label"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={t("labelPlaceholder")}
        />
        <p className="text-xs text-gray-500">{t("labelHint")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="line-payee-id">{t("lineIdLabel")}</Label>
        <Input
          id="line-payee-id"
          value={lineId}
          onChange={(e) => onLineIdChange(e.target.value)}
          placeholder={t("lineIdPlaceholder")}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-xs text-brand-strong hover:underline"
          >
            <ExternalLink className="size-3" />
            <span>{t("testLink")}</span>
          </a>
        )}
      </div>

      <div className="rounded-lg border border-hairline bg-gray-50">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-gray-700"
          aria-expanded={helpOpen}
        >
          <span>{t("help.toggle")}</span>
          <ChevronDown className={`size-4 transition-transform ${helpOpen ? "rotate-180" : ""}`} />
        </button>
        {helpOpen && (
          <div className="space-y-4 px-3 pb-3 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-800">{t("help.linkTitle")}</p>
              <p className="mb-1 text-xs text-gray-500">{t("help.linkDescription")}</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li>{t("help.linkStep1")}</li>
                <li>{t("help.linkStep2")}</li>
                <li>{t("help.linkStep3")}</li>
                <li>{t("help.linkStep4")}</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-gray-800">{t("help.idTitle")}</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                <li>{t("help.idStep1")}</li>
                <li>{t("help.idStep2")}</li>
                <li>{t("help.idStep3")}</li>
              </ol>
              <p className="mt-1 text-xs text-gray-500">{t("help.idOfficialAccount")}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
