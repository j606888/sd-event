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
          "fixed bottom-0 left-0 right-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out pointer-events-auto",
          open ? "translate-y-0 visible" : "translate-y-full invisible pointer-events-none"
        )}
      >
        <div className="flex shrink-0 flex-col gap-0.5 border-b border-gray-100 px-4 pb-4 pt-4">
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          <h2 id="drawer-title" className="text-lg font-bold text-gray-900">
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
