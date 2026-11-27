"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 「按鈕隨時可按，按下才提示缺漏」的共用行為：
 * 呼叫 reveal() 後 showErrors 變 true（元件據此顯示紅字），
 * 並把容器內第一個標了 data-invalid 的元素捲到畫面中央。
 */
export function useRevealErrors<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0) return;
    const target = containerRef.current?.querySelector<HTMLElement>("[data-invalid]");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
  }, [attempt]);

  const reveal = useCallback(() => setAttempt((n) => n + 1), []);

  return { containerRef, showErrors: attempt > 0, reveal };
}
