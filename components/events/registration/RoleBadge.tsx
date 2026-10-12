"use client";

import { cn } from "@/lib/utils";

/** 字母永遠跟著顏色一起出現：門口光線差、或色弱的人也分得出 L / F。 */
const ROLE_META: Record<string, { letter: string; label: string; className: string }> = {
  Leader: { letter: "L", label: "Leader", className: "bg-leader text-white" },
  Follower: { letter: "F", label: "Follower", className: "bg-follower-soft text-follower" },
  "Not sure": { letter: "?", label: "不確定", className: "bg-field text-muted-ink" },
};

const DEFAULT_META = ROLE_META["Not sure"];

type RoleBadgeProps = {
  role: string;
  /** compact：只顯示字母方塊，給名單列這種擠的地方用 */
  compact?: boolean;
};

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const meta = ROLE_META[role] ?? DEFAULT_META;
  if (compact) {
    return (
      <span
        title={meta.label}
        className={cn(
          "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[11px] font-bold",
          meta.className
        )}
      >
        {meta.letter}
        <span className="sr-only">{meta.label}</span>
      </span>
    );
  }
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", meta.className)}>
      {meta.letter} {meta.label}
    </span>
  );
}
