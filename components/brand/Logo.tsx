import { cn } from "@/lib/utils";

type LogoProps = {
  /** onBrand：放在霧藍底上時改用白底方塊，深色方塊在藍底上會糊掉 */
  variant?: "default" | "onBrand";
  /** 只要圖形、不要字標（分頁圖示、窄版側欄） */
  markOnly?: boolean;
  className?: string;
};

/** 雙圓標誌：實心圓帶、空心圓跟，一對舞伴。 */
export function LogoMark({
  variant = "default",
  className,
}: Pick<LogoProps, "variant" | "className">) {
  const onBrand = variant === "onBrand";
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill={onBrand ? "#ffffff" : "var(--ink)"} />
      <circle cx="16" cy="16" r="7" fill="var(--brand)" />
      <circle
        cx="24.5"
        cy="24.5"
        r="6.5"
        fill="none"
        stroke={onBrand ? "var(--ink)" : "#ffffff"}
        strokeWidth="3"
      />
    </svg>
  );
}

export function Logo({ variant = "default", markOnly = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark variant={variant} />
      {markOnly ? (
        <span className="sr-only">SD Event</span>
      ) : (
        <span className="font-display text-lg font-bold tracking-tight text-ink">SD Event</span>
      )}
    </span>
  );
}
