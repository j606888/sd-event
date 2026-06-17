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

type Location = { id: number; name: string };

type LocationSelectProps = {
  value: string;
  locations: Location[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

const ADD_VALUE = "__add__";

export function LocationSelect({
  value,
  locations,
  onValueChange,
  onAddClick,
}: LocationSelectProps) {
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
      <Label htmlFor="location">活動地點 *</Label>
      <Select
        value={safeValue}
        onValueChange={onValueChange2}
      >
        <SelectTrigger id="location" className="w-full min-w-0">
          <SelectValue placeholder="選擇活動地點" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={String(loc.id)}>
              {loc.name}
            </SelectItem>
          ))}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-[#5295BC] focus:text-[#5295BC]"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              新增活動地點
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
