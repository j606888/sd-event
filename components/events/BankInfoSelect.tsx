"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BankInfo = { id: number; bankName: string };

type BankInfoSelectProps = {
  value: string;
  bankInfos: BankInfo[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

export function BankInfoSelect({
  value,
  bankInfos,
  onValueChange,
  onAddClick,
}: BankInfoSelectProps) {
  // Normalize empty string to undefined to keep Select controlled consistently
  const safeValue = value ?? ""

  const onValueChange2 = (val: string) => {
    if (!val || val.trim() === "") return

    onValueChange(val ?? "");
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="bank">銀行資訊 *</Label>
      <div className="flex gap-2">
        <Select
          value={safeValue}
          onValueChange={onValueChange2}
        >
          <SelectTrigger id="bank" className="flex-1 min-w-0">
            <SelectValue placeholder="選擇銀行資訊" />
          </SelectTrigger>
          <SelectContent>
            {bankInfos.map((bank) => (
              <SelectItem key={bank.id} value={String(bank.id)}>
                {bank.bankName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAddClick}
          aria-label="新增銀行資訊"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
