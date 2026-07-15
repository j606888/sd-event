"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
}: DrawerProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        role="presentation"
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/20 transition-opacity",
          open ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          // mobile：貼底滿版的 bottom sheet
          "fixed inset-x-0 bottom-0 z-150 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl pointer-events-auto transition-all duration-300 ease-out",
          // desktop（md+）：置中 modal、固定寬度、四角圓角
          "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[32rem] md:max-w-[calc(100vw-2rem)] md:max-h-[85vh] md:-translate-x-1/2 md:rounded-2xl",
          open
            ? "translate-y-0 visible md:-translate-y-1/2 md:scale-100 md:opacity-100"
            : "translate-y-full invisible pointer-events-none md:translate-y-[-44%] md:scale-95 md:opacity-0",
          className
        )}
      >
        <div className="flex shrink-0 flex-col gap-0.5 border-b border-hairline px-4 pb-4 pt-4">
          {subtitle && (
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{subtitle}</p>
          )}
          <h2 id="drawer-title" className="font-display text-lg font-bold text-ink">
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </>
  );
}
