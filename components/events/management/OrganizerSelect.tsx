"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { siInstagram, siLine, siFacebook } from "simple-icons";
import { Label } from "@/components/ui/label";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { isRenderableImageSrc } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Organizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
};

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
          {organizers.map((org) => {
            const socials = (
              <span className="flex items-center gap-2 text-gray-400">
                {org.instagram && <SimpleIcon icon={siInstagram} size={14} />}
                {org.lineId && <SimpleIcon icon={siLine} size={14} />}
                {org.facebook && <SimpleIcon icon={siFacebook} size={14} />}
                {!org.instagram && !org.lineId && !org.facebook && (
                  <span className="text-gray-400">尚未填寫社群</span>
                )}
              </span>
            );
            return (
              <SelectItem
                key={org.id}
                value={String(org.id)}
                description={socials}
                leading={
                  isRenderableImageSrc(org.photoUrl) ? (
                    <span className="relative block size-7 overflow-hidden rounded-full bg-gray-100">
                      <Image
                        src={org.photoUrl}
                        alt={org.name}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </span>
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                      {org.name.charAt(0)}
                    </span>
                  )
                }
              >
                {org.name}
              </SelectItem>
            );
          })}
          <SelectItem
            value={ADD_VALUE}
            className="mt-1 border-t border-gray-100 pl-3 font-medium text-brand focus:text-brand"
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
