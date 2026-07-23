"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, LogOut } from "lucide-react";
import { useSession } from "@/hooks/use-session";

/** 模擬檢視中的全域提示條，避免誤以為操作的是自己的帳號 */
export function ImpersonationBanner() {
  const { impersonation } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stopping, setStopping] = useState(false);

  if (!impersonation) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setStopping(false);
        return;
      }
      queryClient.clear();
      router.push("/admin");
      router.refresh();
    } catch {
      setStopping(false);
    }
  };

  return (
    <div className="sticky top-0 z-[90] flex flex-wrap items-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-ink">
      <Eye className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-semibold">
        你正在以「{impersonation.targetName}」的身分檢視
        <span className="font-normal"> — 唯讀模式，無法新增或修改任何資料</span>
      </p>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        <LogOut className="size-3.5" />
        {stopping ? "結束中…" : "結束模擬"}
      </button>
    </div>
  );
}
