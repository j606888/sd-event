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

type Organizer = { id: number; name: string };

type OrganizerSelectProps = {
  value: string;
  organizers: Organizer[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

const ADD_VALUE = "__add__";

export function OrganizerSelect({
  value,
  organizers,
  onValueChange,
  onAddClick,
}: OrganizerSelectProps) {
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
      <Label htmlFor="organizer">主辦單位 *</Label>
      <Select
        value={safeValue}
        onValueChange={onValueChange2}
      >
        <SelectTrigger id="organizer" className="w-full min-w-0">
          <SelectValue placeholder="選擇主辦單位" />
        </SelectTrigger>
        <SelectContent>
          {organizers.map((org) => (
            <SelectItem key={org.id} value={String(org.id)}>
              {org.name}
            </SelectItem>
          ))}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-[#5295BC] focus:text-[#5295BC]"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              新增主辦單位
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
