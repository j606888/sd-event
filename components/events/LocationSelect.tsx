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

type Location = { id: number; name: string };

type LocationSelectProps = {
  value: string;
  locations: Location[];
  onValueChange: (value: string) => void;
  onAddClick: () => void;
};

export function LocationSelect({
  value,
  locations,
  onValueChange,
  onAddClick,
}: LocationSelectProps) {
  const safeValue = value ?? ""

  const onValueChange2 = (val: string) => {
    if (!val || val.trim() === "") return

    onValueChange(val ?? "");
  }
  
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="location">活動地點 *</Label>
      <div className="flex gap-2">
        <Select
          value={safeValue}
          onValueChange={onValueChange2}
        >
          <SelectTrigger id="location" className="flex-1 min-w-0">
            <SelectValue placeholder="選擇活動地點" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAddClick}
          aria-label="新增活動地點"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
