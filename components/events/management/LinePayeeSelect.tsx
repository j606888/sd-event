"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LinePayee = {
  id: number;
  label: string;
  lineId: string;
};

type LinePayeeSelectProps = {
  value: string;
  linePayees: LinePayee[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

const ADD_VALUE = "__add__";
const NONE_VALUE = "__none__";

/** 活動的 LINE 付款好友（選填）；不選則報名表不提供 Line Pay 付款方式 */
export function LinePayeeSelect({
  value,
  linePayees,
  onValueChange,
  onAddClick,
}: LinePayeeSelectProps) {
  const t = useTranslations("savedInfo.linePayee");
  const safeValue = value || NONE_VALUE;

  const handleChange = (val: string) => {
    if (val === ADD_VALUE) {
      onAddClick();
      return;
    }
    // Radix Select 的隱藏 native select 在載入時（瀏覽器回填表單）會以空字串觸發 onChange。
    // 真正的「不開放」是 NONE_VALUE，空字串一律忽略 —— 否則一進頁面就被標成有未儲存的變更，
    // 已選的付款好友也可能被清掉。
    if (!val) return;
    const next = val === NONE_VALUE ? "" : val;
    if (next === (value || "")) return;
    onValueChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="line-payee">{t("selectLabel")}</Label>
      <Select value={safeValue} onValueChange={handleChange}>
        <SelectTrigger id="line-payee" className="w-full min-w-0">
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE} description={t("noneDescription")}>
            {t("none")}
          </SelectItem>
          {linePayees.map((p) => (
            <SelectItem key={p.id} value={String(p.id)} description={<span className="break-all">{p.lineId}</span>}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-brand-strong focus:text-brand-strong"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              <span>{t("selectAdd")}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
