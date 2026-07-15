"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

type SegmentedToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  /** 佔滿容器寬度，選項均分（表單用） */
  fullWidth?: boolean;
  "aria-label"?: string;
};

/**
 * 統一的 segmented pill 切換元件（單選/可複選、必選/可跳過、報名/已入場…）。
 * 灰底膠囊容器，選中項浮起為白底。
 */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
  disabled,
  fullWidth,
  "aria-label": ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-gray-100 p-0.5",
        fullWidth && "flex w-full",
        disabled && "opacity-50",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
              fullWidth && "flex-1",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
