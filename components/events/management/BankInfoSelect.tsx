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

type BankInfo = {
  id: number;
  label: string | null;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type BankInfoSelectProps = {
  value: string;
  bankInfos: BankInfo[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

const ADD_VALUE = "__add__";

export function BankInfoSelect({
  value,
  bankInfos,
  onValueChange,
  onAddClick,
}: BankInfoSelectProps) {
  const t = useTranslations("savedInfo.bank");
  // Normalize empty string to undefined to keep Select controlled consistently
  const safeValue = value ?? ""

  const onValueChange2 = (val: string) => {
    if (val === ADD_VALUE) {
      onAddClick();
      return;
    }
    if (!val || val.trim() === "") return

    onValueChange(val ?? "");
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="bank">{t("selectLabel")}</Label>
      <Select
        value={safeValue}
        onValueChange={onValueChange2}
      >
        <SelectTrigger id="bank" className="w-full min-w-0">
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {bankInfos.map((bank) => (
            <SelectItem
              key={bank.id}
              value={String(bank.id)}
              description={[
                bank.label ? `${bank.bankName} ${bank.bankCode}` : null,
                bank.account ? t("selectAccount", { account: bank.account }) : t("selectNoAccount"),
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              {bank.label || `${bank.bankName} ${bank.bankCode}`}
            </SelectItem>
          ))}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-brand-strong focus:text-brand-strong"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              <span>{t("add")}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
