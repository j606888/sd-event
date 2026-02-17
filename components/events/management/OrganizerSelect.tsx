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

type Organizer = { id: number; name: string };

type OrganizerSelectProps = {
  value: string;
  organizers: Organizer[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

export function OrganizerSelect({
  value,
  organizers,
  onValueChange,
  onAddClick,
}: OrganizerSelectProps) {
  // Normalize empty string to undefined to keep Select controlled consistently
  const safeValue = value ?? ""

  const onValueChange2 = (val: string) => {
    if (!val || val.trim() === "") return

    onValueChange(val ?? "");
  }
  
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="organizer">主辦單位 *</Label>
      <div className="flex gap-2">
        <Select
          value={safeValue}
          onValueChange={onValueChange2}
        >
          <SelectTrigger id="organizer" className="flex-1 min-w-0">
            <SelectValue placeholder="選擇主辦單位" />
          </SelectTrigger>
          <SelectContent>
            {organizers.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAddClick}
          aria-label="新增主辦單位"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
