"use client";

/** 參加者有勾選活動的勾選項目（如「參加伸展台比賽」）時顯示的標籤 */
export function FlagBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      {label}
    </span>
  );
}
