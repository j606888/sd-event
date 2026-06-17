import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * next/image 只接受「以 / 開頭的路徑」或「合法的絕對 http(s) URL」。
 * 髒資料（如 photoUrl="1"）會讓 next/image 內部 new URL() 丟出
 * 「Failed to construct 'URL': Invalid URL」並讓整頁崩潰，故渲染前先過濾。
 */
export function isRenderableImageSrc(
  src: string | null | undefined
): src is string {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
