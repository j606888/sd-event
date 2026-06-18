"use client";

import { Plus } from "lucide-react";
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
      <Label htmlFor="bank">銀行資訊 *</Label>
      <Select
        value={safeValue}
        onValueChange={onValueChange2}
      >
        <SelectTrigger id="bank" className="w-full min-w-0">
          <SelectValue placeholder="選擇銀行資訊" />
        </SelectTrigger>
        <SelectContent>
          {bankInfos.map((bank) => (
            <SelectItem
              key={bank.id}
              value={String(bank.id)}
              description={bank.account ? `帳號 ${bank.account}` : "尚未填寫帳號"}
            >
              {bank.bankName} {bank.bankCode}
            </SelectItem>
          ))}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-brand focus:text-brand"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              新增銀行資訊
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
