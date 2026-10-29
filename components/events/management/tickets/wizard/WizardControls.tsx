"use client";

import { useState } from "react";
import { Check, Lock, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 每一步最上面的問題與說明 */
export function StepIntro({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold leading-tight text-ink md:text-[1.75rem]">
        {title}
      </h2>
      {description && <p className="mt-2 text-[15px] text-muted-ink">{description}</p>}
    </div>
  );
}

/** 是／否兩個大按鈕（一問一答的主要回答方式） */
export function ChoicePair({
  value,
  onChange,
  yesLabel,
  noLabel,
  ariaLabel,
  size = "lg",
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  yesLabel: string;
  noLabel: string;
  ariaLabel: string;
  size?: "lg" | "md";
}) {
  const option = (active: boolean, label: string, next: boolean) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(next)}
      className={cn(
        "flex flex-1 basis-48 items-center gap-2 rounded-xl px-4 text-left font-semibold transition-colors cursor-pointer",
        size === "lg" ? "min-h-13 text-[15px]" : "min-h-12 text-sm",
        active
          ? "bg-brand-soft text-brand-strong ring-2 ring-inset ring-brand"
          : "bg-white text-ink ring-1 ring-inset ring-card-border hover:bg-paper"
      )}
    >
      {active && <Check className="size-4 shrink-0" aria-hidden />}
      <span>{label}</span>
    </button>
  );
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2.5">
      {option(value, yesLabel, true)}
      {option(!value, noLabel, false)}
    </div>
  );
}

/** 選項卡片（活動型態、特殊賣法） */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  kind,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  kind: "radio" | "checkbox";
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl transition-colors",
        selected
          ? "bg-brand-soft ring-2 ring-inset ring-brand"
          : "bg-white ring-1 ring-inset ring-card-border"
      )}
    >
      <button
        type="button"
        role={kind}
        aria-checked={selected}
        onClick={onClick}
        className="flex w-full items-start gap-3.5 p-4 text-left text-ink cursor-pointer"
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center",
            kind === "radio" ? "rounded-full" : "rounded-md",
            selected
              ? kind === "radio"
                ? "border-[6px] border-brand-strong bg-white"
                : "bg-brand-strong text-white"
              : "border-2 border-gray-400 bg-white"
          )}
        >
          {selected && kind === "checkbox" && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-base font-bold">{title}</span>
          <span className="text-sm text-muted-ink">{description}</span>
        </span>
      </button>
      {selected && children && <div className="px-4 pb-4 sm:pl-[3.25rem]">{children}</div>}
    </div>
  );
}

/** 整數金額輸入；可以先清空再打，離開欄位前不會被補成 0 */
export function PriceInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  // 打字中才用自己的文字（允許暫時空白）；沒在打時直接顯示外部的值（「每天同價」連動也跟得上）
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div
      className={cn(
        "flex h-11 min-w-0 items-center gap-1.5 rounded-md bg-field px-3 focus-within:ring-2 focus-within:ring-brand/30",
        className
      )}
    >
      <span className="text-sm text-muted-ink" aria-hidden>
        $
      </span>
      <input
        inputMode="numeric"
        aria-label={ariaLabel}
        value={draft ?? String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
          setDraft(digits);
          onChange(digits === "" ? 0 : Number(digits));
        }}
        onBlur={() => setDraft(null)}
        className="w-full min-w-0 bg-transparent text-base font-semibold text-ink tabular-nums outline-none"
      />
    </div>
  );
}

/** 一張票在每個票價階段的價格（不分階段時只有一格） */
export function TierPriceFields({
  tiers,
  prices,
  onChange,
  ticketName,
  compact,
  inputClassName,
}: {
  tiers: { name: string; sub?: string }[];
  prices: number[];
  onChange: (prices: number[]) => void;
  ticketName: string;
  compact?: boolean;
  /** 放在淺藍選項卡裡時改白底，不然灰底欄位看不清楚 */
  inputClassName?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {tiers.map((tier, i) => (
        <label key={i} className="flex min-w-0 flex-1 basis-36 flex-col gap-1.5">
          <span className={cn("font-semibold text-ink", compact ? "text-xs text-muted-ink" : "text-[13px]")}>
            {tier.name}
          </span>
          <PriceInput
            value={prices[i] ?? 0}
            className={inputClassName}
            ariaLabel={`${ticketName} · ${tier.name}`}
            onChange={(v) => onChange(prices.map((p, j) => (j === i ? v : p)))}
          />
          {tier.sub && !compact && <span className="text-xs text-muted-ink">{tier.sub}</span>}
        </label>
      ))}
    </div>
  );
}

/** 一般文字欄位（精靈裡統一用 44px 高） */
export function WizardInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn("h-11", props.className)} />;
}

/** 自動規則／搭配說明；lock = 選了某票就鎖住別的 */
export function RuleNote({ lock, children }: { lock?: boolean; children: React.ReactNode }) {
  const Icon = lock ? Lock : Check;
  return (
    <p className="flex items-start gap-2.5 text-sm text-ink">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function RuleBox({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-lg bg-paper px-3.5 py-3">{children}</div>;
}

/** 回答「不用」之後的一句說明 */
export function SkippedNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-paper px-4 py-3.5 text-sm text-gray-700">{children}</p>;
}

export function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg border border-dashed border-gray-400 bg-white px-3.5 text-sm font-semibold text-brand-strong hover:bg-paper cursor-pointer"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

export function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-ink hover:bg-gray-100 hover:text-ink cursor-pointer"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}

/** 一列可編輯的票（課程／Party）：欄位可換行，移除鈕固定在右邊 */
export function EditableRow({ children, onRemove, removeLabel }: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-inset ring-hairline">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      <RemoveRowButton onClick={onRemove} label={removeLabel} />
    </div>
  );
}

/** 勾選框（每天同價、跟著階段調價） */
export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[18px] rounded border-gray-300 accent-brand-strong"
      />
      {children}
    </label>
  );
}
