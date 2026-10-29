"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CompiledItem, PlanStep, TicketPlan } from "@/lib/ticket-plan";
import { cn } from "@/lib/utils";
import { money, planBlocks, planPaths, type BlockId, type PlanPath } from "./plan-view";

const DOT: Record<BlockId, string> = {
  full: "bg-ink",
  entry: "bg-ink",
  day: "bg-brand",
  single: "bg-gray-400",
};

const CHIP: Record<PlanPath["chips"][number]["tone"], string> = {
  dark: "bg-ink text-white",
  soft: "bg-brand-soft text-brand-strong",
  plain: "bg-field text-ink",
};

/** 「報名者怎麼買」：買 Full Pass，或不買 Full Pass 自己搭 */
export function PlanPaths({ plan, compact }: { plan: TicketPlan; compact?: boolean }) {
  const t = useTranslations("ticketWizard.review");
  const paths = planPaths(plan);
  if (paths.length === 0) return null;
  const chipLabel = (label: PlanPath["chips"][number]["label"]) =>
    label === "full"
      ? plan.groupTitles.full
      : label === "day"
        ? plan.groupTitles.day
        : label === "classes"
          ? plan.groupTitles.classes
          : plan.groupTitles.parties;
  return (
    <div className={cn("flex gap-2.5", compact ? "flex-col" : "flex-wrap items-stretch")}>
      {paths.map((path, i) => (
        <div key={path.id} className={cn("flex gap-2.5", compact ? "flex-col" : "flex-1 basis-56 items-stretch")}>
          {i > 0 && (
            <span className="self-center text-sm font-bold text-muted-ink">{t("or")}</span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-3.5 ring-1 ring-inset ring-card-border">
            <span className="text-sm font-bold text-ink">
              {path.id === "full" ? t("buyFull") : plan.full.enabled ? t("skipFull") : t("mix")}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {path.chips.map((chip, j) => (
                <span
                  key={chip.label}
                  className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-semibold", CHIP[chip.tone])}
                >
                  {path.id === "full" && j > 0 ? `+ ${chipLabel(chip.label)}` : chipLabel(chip.label)}
                </span>
              ))}
            </span>
            <span className="text-[13px] text-muted-ink">{t(path.desc)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type SoldInfo = Map<string, number>;

/**
 * 依買法分區塊的價格（Full Pass／Day Pass／單獨購買）；精靈確認頁與後台共用。
 * soldByKey 有給才顯示「已售」欄（後台）；currentTier 標出現在的票價階段。
 */
export function PlanBlocks({
  plan,
  onEdit,
  soldByKey,
  currentTier,
}: {
  plan: TicketPlan;
  onEdit?: (step: PlanStep) => void;
  soldByKey?: SoldInfo;
  currentTier?: number;
}) {
  const t = useTranslations("ticketWizard.blocks");
  const tOverview = useTranslations("ticketWizard.overview");
  const blocks = planBlocks(plan);
  const tierNames = plan.tiered ? plan.tiers.map((tier) => tier.name) : [t("price")];
  const showSold = soldByKey != null;
  const columns = `minmax(9rem, 2fr) repeat(${tierNames.length}, minmax(4.75rem, 1fr))${showSold ? " 3.5rem" : ""}`;

  const soldLabel = (item: CompiledItem) => {
    const n = soldByKey?.get(item.key) ?? 0;
    return item.seatCount > 1 ? tOverview("bundleSold", { count: n }) : String(n);
  };

  const blockText = (id: BlockId) => {
    switch (id) {
      case "full":
        return {
          title: plan.groupTitles.full,
          desc:
            plan.full.includesParty || !plan.parties.enabled ? t("full") : t("fullNoParty"),
        };
      case "day":
        return { title: plan.groupTitles.day, desc: t("day") };
      case "entry":
        return { title: plan.groupTitles.entry, desc: t("entry") };
      default:
        return { title: t("single"), desc: t("singleDesc") };
    }
  };

  const priceCells = (item: CompiledItem) =>
    item.flat ? (
      <span
        className="rounded-md bg-paper px-2 py-1 text-center font-semibold"
        style={{ gridColumn: `span ${tierNames.length}` }}
      >
        {money(item.amount)}
        {plan.tiered && <span className="font-normal text-muted-ink"> · {t("flatNote")}</span>}
      </span>
    ) : (
      item.prices.map((p, i) => (
        <span
          key={p.tierKey}
          className={cn(
            "rounded-md px-2 py-1 text-right tabular-nums",
            !p.available
              ? "text-muted-ink"
              : i === currentTier
                ? "bg-brand-soft font-bold text-ink"
                : "font-semibold text-ink"
          )}
        >
          {p.available ? money(p.amount) : t("soldOut")}
        </span>
      ))
    );

  return (
    <div className="flex flex-col gap-3.5">
      {blocks.map((block) => {
        const { title, desc } = blockText(block.id);
        return (
          <section
            key={block.id}
            className="rounded-2xl bg-white ring-1 ring-inset ring-card-border"
          >
            <div className="flex items-center gap-2.5 pl-4 pr-2 pt-3 sm:pl-5">
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", DOT[block.id])} />
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h3 className="font-display text-[17px] font-bold text-ink">{title}</h3>
                <span className="text-[13px] text-muted-ink">{desc}</span>
              </div>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(block.step)}
                  aria-label={t("editAria", { block: title })}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-brand-strong hover:bg-brand-soft cursor-pointer"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {t("edit")}
                </button>
              )}
            </div>

            {block.rows.length > 0 && (
              <div className="overflow-x-auto">
                <div className="min-w-[30rem] px-4 pb-2 sm:px-5">
                  <div
                    className="grid items-end gap-x-2 py-2 text-xs font-semibold text-muted-ink"
                    style={{ gridTemplateColumns: columns }}
                  >
                    <span />
                    {tierNames.map((name, i) => (
                      <span key={i} className={cn("text-right", i === currentTier && "text-brand-strong")}>
                        {name}
                      </span>
                    ))}
                    {showSold && <span className="text-right">{tOverview("sold")}</span>}
                  </div>
                  {block.rows.map((item) => (
                    <div
                      key={item.key}
                      className="grid items-center gap-x-2 border-t border-hairline py-2.5 text-[15px]"
                      style={{ gridTemplateColumns: columns }}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold text-ink">{item.name}</span>
                        {item.description && (
                          <span className="text-xs text-muted-ink">{item.description}</span>
                        )}
                      </span>
                      {priceCells(item)}
                      {showSold && (
                        <span className="text-right text-sm font-semibold tabular-nums text-ink">
                          {soldLabel(item)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {block.groups.length > 0 && (
              <div className="flex flex-wrap gap-x-7 px-4 pb-2.5 sm:px-5">
                {block.groups.map((group) => (
                  <div key={group.id} className="min-w-0 flex-1 basis-60">
                    <p className="mb-0.5 mt-2.5 text-xs font-bold text-muted-ink">
                      {group.id === "classes" ? plan.groupTitles.classes : plan.groupTitles.parties}
                    </p>
                    {group.items.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 border-t border-hairline py-2.5"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[15px] font-semibold text-ink">{item.name}</span>
                          {item.description && (
                            <span className="text-xs text-muted-ink">{item.description}</span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="font-semibold tabular-nums text-ink">
                            {item.flat
                              ? money(item.amount)
                              : item.prices.map((p) => money(p.amount)).join(" → ")}
                          </span>
                          {showSold && (
                            <span className="w-10 text-right text-sm text-muted-ink tabular-nums">
                              {soldLabel(item)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {plan.coupon.enabled && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <span className="rounded-full bg-field px-2.5 py-0.5 font-bold tracking-wide text-ink">
            {plan.coupon.code.trim().toUpperCase()}
          </span>
          <span>
            {t("couponLine", { rate: plan.coupon.rate })}
            {plan.coupon.usageLimit != null && t("couponLimit", { count: plan.coupon.usageLimit })}
          </span>
        </p>
      )}
    </div>
  );
}
