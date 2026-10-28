"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** 字母永遠跟著顏色一起出現：門口光線差、或色弱的人也分得出 L / F。 */
const ROLE_META: Record<string, { letter: string; labelKey: "Leader" | "Follower" | "notSure"; className: string }> = {
  Leader: { letter: "L", labelKey: "Leader", className: "bg-leader text-white" },
  Follower: { letter: "F", labelKey: "Follower", className: "bg-follower-soft text-follower" },
  "Not sure": { letter: "?", labelKey: "notSure", className: "bg-field text-muted-ink" },
};

const DEFAULT_META = ROLE_META["Not sure"];

type RoleBadgeProps = {
  role: string;
  /** compact：只顯示字母方塊，給名單列這種擠的地方用 */
  compact?: boolean;
};

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const t = useTranslations("enums.role");
  const meta = ROLE_META[role] ?? DEFAULT_META;
  const label = t(meta.labelKey);
  if (compact) {
    return (
      <span
        title={label}
        className={cn(
          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[11px] font-bold",
          meta.className
        )}
      >
        {meta.letter}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", meta.className)}>
      {`${meta.letter} ${label}`}
    </span>
  );
}
