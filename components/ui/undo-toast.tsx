"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type UndoToastProps = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** 自動消失前的毫秒數 */
  duration?: number;
};

/**
 * 剛做完的動作可以反悔的底部提示。
 * 換一則訊息時請給不同的 `key`，計時才會重來。
 */
export function UndoToast({ message, onUndo, onDismiss, duration = 6000 }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:bottom-6"
    >
      <div className="flex max-w-full items-center gap-3 rounded-2xl bg-ink py-1.5 pl-4 pr-1.5 text-sm text-white shadow-lg">
        <Check className="size-4 shrink-0 text-brand" strokeWidth={3} />
        <span className="min-w-0 truncate">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="h-10 shrink-0 cursor-pointer rounded-xl bg-white/10 px-4 font-bold transition-colors hover:bg-white/20"
        >
          復原
        </button>
      </div>
    </div>
  );
}
