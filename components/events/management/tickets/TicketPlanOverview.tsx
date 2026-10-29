"use client";

import { CircleHelp, ListChecks, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { compileTicketPlan, type PlanStep, type TicketPlan } from "@/lib/ticket-plan";
import type { PurchaseItemDraft } from "@/hooks/use-event-form";
import { cn } from "@/lib/utils";
import { PlanBlocks, PlanPaths } from "./wizard/PlanBlocks";
import { currentTierIndex, shortDate } from "./wizard/plan-view";
import { useTierFields } from "./wizard/WizardSteps";

const TIMELINE_TONES = ["bg-brand-strong text-white", "bg-brand text-ink", "bg-brand-soft text-ink"];

/**
 * 用精靈建立的票券在後台的樣子：照精靈的步驟分段呈現，每段「修改」回到那一步。
 * 進階設定（區塊／互斥）收在右側，平常不用看。
 */
export function TicketPlanOverview({
  plan,
  mode,
  purchaseItems,
  onEditStep,
  onRerun,
  onAdvanced,
}: {
  plan: TicketPlan;
  mode: "create" | "edit";
  purchaseItems: PurchaseItemDraft[];
  onEditStep: (step: PlanStep) => void;
  onRerun: () => void;
  onAdvanced: () => void;
}) {
  const t = useTranslations("ticketWizard.overview");
  const tSteps = useTranslations("ticketWizard.steps");
  const tBlocks = useTranslations("ticketWizard.blocks");
  const tReview = useTranslations("ticketWizard.review");
  const tSummary = useTranslations("ticketWizard.summary");
  const tierFields = useTierFields(plan);
  const compiled = compileTicketPlan(plan);
  const nowTier = currentTierIndex(plan);

  // 已售數：plan 的 key → 實際項目 id → 載入的項目（create 模式還沒有，不顯示這欄）
  const itemIds = plan.ids?.items ?? {};
  const soldByKey =
    mode === "edit"
      ? new Map(
          Object.entries(itemIds).map(([key, id]) => [
            key,
            purchaseItems.find((item) => item.id === id)?.soldCount ?? 0,
          ])
        )
      : undefined;
  const planItemIds = new Set(Object.values(itemIds));
  const hiddenCount = purchaseItems.filter(
    (item) => item.id != null && item.hidden && !planItemIds.has(item.id)
  ).length;

  const tierNow = plan.tiered ? plan.tiers[nowTier] : null;
  const groupTitle = (key: string) => compiled.groups.find((g) => g.key === key)?.title ?? key;
  const exclusionText = (() => {
    const partners = compiled.exclusions.map(([, b]) => groupTitle(b));
    return partners.length ? `${groupTitle("full")} ↔ ${partners.join("、")}` : null;
  })();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-brand-soft px-5 py-4">
        <ListChecks className="size-6 shrink-0 text-brand-strong" aria-hidden />
        <div className="min-w-0 flex-1 basis-72">
          <p className="font-bold text-ink">{t("banner")}</p>
          <p className="mt-0.5 text-sm text-gray-700">
            {mode === "create" ? t("createHint") : t("bannerHint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onRerun} className="h-11 bg-white">
            {t("rerun")}
          </Button>
          <Button type="button" variant="ghost" onClick={onAdvanced} className="h-11 text-brand-strong">
            {t("advanced")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="surface-card min-w-0 flex-[999_1_36rem] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">{t("title")}</h2>
            {tierNow && (
              <span className="rounded-full bg-butter-soft px-3 py-1 text-[13px] font-semibold text-butter-ink">
                {nowTier < plan.tiers.length - 1 && tierNow.endsAt
                  ? t("nowTierUntil", { tier: tierNow.name, date: shortDate(tierNow.endsAt) })
                  : t("nowTier", { tier: tierNow.name })}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-ink">{tSteps("tiers")}</span>
              <button
                type="button"
                onClick={() => onEditStep("tiers")}
                aria-label={tBlocks("editAria", { block: tSteps("tiers") })}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-brand-strong hover:bg-brand-soft cursor-pointer"
              >
                <Pencil className="size-3.5" aria-hidden />
                {tBlocks("edit")}
              </button>
            </div>
            {plan.tiered ? (
              <div className="flex gap-1 overflow-hidden rounded-xl">
                {plan.tiers.map((tier, i) => (
                  <div
                    key={tier.key}
                    className={cn(
                      "min-w-0 flex-1 px-3 py-2.5",
                      TIMELINE_TONES[Math.min(i, TIMELINE_TONES.length - 1)],
                      i === nowTier && "ring-2 ring-inset ring-butter"
                    )}
                  >
                    <div className="truncate text-[13px] font-bold">{tier.name}</div>
                    <div className="truncate text-xs">{tierFields[i]?.sub}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-paper px-4 py-3 text-sm text-gray-700">
                {tSummary("singlePrice")}
              </p>
            )}
          </div>

          <div className="mt-5">
            <PlanBlocks
              plan={plan}
              onEdit={onEditStep}
              soldByKey={soldByKey}
              currentTier={plan.tiered ? nowTier : undefined}
            />
          </div>

          {hiddenCount > 0 && (
            <p className="mt-4 text-[13px] text-muted-ink">{t("hiddenItems", { count: hiddenCount })}</p>
          )}
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0">
          {plan.kind !== "party" && (
            <section className="surface-card flex flex-col gap-3 px-5 py-4">
              <h3 className="text-[15px] font-bold text-ink">{tReview("pathsTitle")}</h3>
              <PlanPaths plan={plan} compact />
            </section>
          )}

          <section className="surface-card flex flex-col gap-2.5 px-5 py-4">
            <div>
              <h3 className="text-[15px] font-bold text-ink">{t("builtTitle")}</h3>
              <p className="text-[13px] text-muted-ink">{t("builtHint")}</p>
            </div>
            <dl className="flex flex-col text-[13px]">
              <div className="flex justify-between gap-3 border-t border-hairline py-2">
                <dt className="text-muted-ink">{t("builtTiers")}</dt>
                <dd className="text-right font-semibold text-ink">
                  {t("builtTiersValue", { count: compiled.tiers.length })}
                </dd>
              </div>
              {compiled.groups.map((g) => (
                <div key={g.key} className="flex justify-between gap-3 border-t border-hairline py-2">
                  <dt className="text-muted-ink">{t("builtGroup", { title: g.title })}</dt>
                  <dd className="text-right font-semibold text-ink">
                    {t("builtGroupValue", {
                      mode: t(g.selectionMode),
                      required: t(g.required ? "required" : "optional"),
                      count: compiled.items.filter((i) => i.groupKey === g.key).length,
                    })}
                  </dd>
                </div>
              ))}
              {exclusionText && (
                <div className="flex justify-between gap-3 border-t border-hairline py-2">
                  <dt className="shrink-0 text-muted-ink">{t("builtExclusions")}</dt>
                  <dd className="text-right font-semibold text-ink">{exclusionText}</dd>
                </div>
              )}
              {compiled.coupon && (
                <div className="flex justify-between gap-3 border-t border-hairline py-2">
                  <dt className="text-muted-ink">{t("builtCoupon")}</dt>
                  <dd className="text-right font-semibold tracking-wide text-ink">{compiled.coupon.code}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="flex items-start gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3.5">
            <CircleHelp className="mt-0.5 size-[18px] shrink-0 text-brand-strong" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-ink">{t("helpTitle")}</p>
              <p className="mt-0.5 text-muted-ink">
                {t("helpBody")}
                <a
                  href="https://ig.me/m/damn.dingding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-strong underline-offset-2 hover:underline"
                >
                  {t("helpLink")}
                </a>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
