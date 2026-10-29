"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TicketPlanWizard } from "@/components/events/management/tickets/wizard/TicketPlanWizard";
import { buildDefaultPlan } from "@/components/events/management/tickets/wizard/plan-view";
import { CREATE_STEPS, STEP_KIND } from "@/lib/create-event";
import { planSteps, type PlanStep, type TicketPlan } from "@/lib/ticket-plan";
import { cn } from "@/lib/utils";
import { useCreateEvent, type UseCreateEventReturn } from "@/hooks/use-create-event";
import { CreateEventPreview } from "./CreateEventPreview";
import {
  CoverStep,
  DatesStep,
  DescriptionStep,
  LocationStep,
  OrganizerStep,
  PaymentStep,
  ReviewStep,
  TicketsStep,
  TitleStep,
  TypeStep,
  useStepAnswers,
} from "./CreateEventSteps";

/**
 * 建立活動：一步一步填（類型 → 名稱 → 日期 → 地點 → 封面 → 介紹 → 主辦 → 收款 → 票券 → 完成）。
 * 全螢幕蓋住後台版面，專心填完；右邊的報名頁預覽跟著長出來。
 */
export function CreateEventWizard({ teamId }: { teamId: number }) {
  const t = useTranslations("createEvent");
  const tWizard = useTranslations("ticketWizard");
  const tTemplates = useTranslations("eventForm.templates");
  const locale = useLocale();
  const form = useCreateEvent(teamId);
  const { step, idx } = form;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ticketWizard, setTicketWizard] = useState<{ plan: TicketPlan; step: PlanStep } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // 換步驟：捲回頂端、把焦點移到題目（鍵盤與讀屏使用者知道換頁了）
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // 售票精靈：新的從「票價階段」開始（類型和天數前面已經問過、已帶入）；修改直接到確認頁
  const openTicketWizard = (edit: boolean) => {
    const plan =
      form.ticketPlan ??
      buildDefaultPlan({
        eventType: form.type ?? "Workshop",
        startAt: form.startAt,
        endAt: form.endAt,
        locale,
        t: (key, values) => tWizard(key as never, values as never),
        tTemplates: (key) => tTemplates(key as never),
      });
    setTicketWizard({ plan, step: edit ? "review" : planSteps(plan.kind)[1] });
  };

  const kind = step === "review" ? null : STEP_KIND[step];
  const isLast = idx === CREATE_STEPS.length - 1;
  const filledHere = form.filled[step];
  const skippable = kind === "publish" || kind === "optional";
  const nextStep = CREATE_STEPS[idx + 1];
  const busy = form.saving != null;

  // z-[95]：蓋過側邊欄（z-70）與模擬檢視橫幅（z-90），售票精靈（z-100）再蓋在上面
  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-paper">
      <header className="flex shrink-0 items-center gap-2 border-b border-hairline bg-white px-2 py-1.5 sm:px-4">
        <button
          type="button"
          onClick={form.leave}
          aria-label={t("header.leave")}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-gray-100 cursor-pointer"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-bold text-ink">{t("header.title")}</h1>
          <p className="truncate text-xs text-muted-ink lg:hidden">
            {t("header.progress", { n: idx + 1, total: CREATE_STEPS.length, step: t(`steps.${step}`) })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={t("header.preview")}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink ring-1 ring-inset ring-card-border hover:bg-paper xl:hidden cursor-pointer"
        >
          <Eye className="size-[18px]" />
        </button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => form.submit(false)}
          className="h-11 shrink-0 px-3.5 text-sm font-semibold"
        >
          {form.saving === "draft" ? t("nav.saving") : t("header.saveDraft")}
        </Button>
      </header>
      <div aria-hidden className="h-1 shrink-0 bg-hairline lg:hidden">
        <div
          className="h-1 bg-brand transition-[width] motion-reduce:transition-none"
          style={{ width: `${Math.round(((idx + 1) / CREATE_STEPS.length) * 100)}%` }}
        />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1320px] items-start gap-6 px-4 py-5 md:px-6 md:py-7">
          <StepRail form={form} />

          {/* 後台版面已經有 <main>，這裡不再包一層 */}
          <div className="min-w-0 flex-1">
            <section className="surface-card flex flex-col gap-6 px-5 pt-5 md:px-7 md:pt-6 lg:pb-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] font-semibold text-brand-strong">
                  {t("stepOf", { n: idx + 1, total: CREATE_STEPS.length })}
                </span>
                {kind && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      kind === "required" && "bg-brand-soft text-brand-strong",
                      kind === "publish" && "bg-butter-soft text-butter-ink",
                      kind === "optional" && "bg-field text-gray-700"
                    )}
                  >
                    {t(`kind.${kind}`)}
                  </span>
                )}
              </div>

              <div ref={headingRef} tabIndex={-1} className="outline-none">
                {step === "type" && <TypeStep form={form} />}
                {step === "title" && <TitleStep form={form} />}
                {step === "dates" && <DatesStep form={form} />}
                {step === "location" && <LocationStep form={form} />}
                {step === "cover" && <CoverStep form={form} />}
                {step === "description" && <DescriptionStep form={form} />}
                {step === "organizer" && <OrganizerStep form={form} />}
                {step === "payment" && <PaymentStep form={form} />}
                {step === "tickets" && <TicketsStep form={form} onOpenWizard={openTicketWizard} />}
                {step === "review" && <ReviewStep form={form} />}
              </div>

              {form.saveError && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {form.saveError}
                </p>
              )}

              {/* 手機貼在畫面底部，桌機跟著卡片 */}
              <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 rounded-b-2xl border-t border-hairline bg-white px-5 py-3 md:-mx-7 md:px-7 lg:static lg:mx-0 lg:rounded-none lg:px-0 lg:pb-0 lg:pt-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={idx === 0}
                    onClick={form.back}
                    aria-label={t("nav.back")}
                    className="h-12 shrink-0 gap-2 px-3 text-[15px] font-semibold"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    <span className="hidden sm:inline">{t("nav.back")}</span>
                  </Button>
                  <div className="flex min-w-0 flex-1 justify-end gap-2">
                    {isLast ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => form.submit(false)}
                          className="h-12 shrink-0 px-4 text-[15px] font-semibold"
                        >
                          {form.saving === "draft" ? t("nav.saving") : t("nav.saveDraft")}
                        </Button>
                        <Button
                          type="button"
                          disabled={busy || form.missing.length > 0}
                          onClick={() => form.submit(true)}
                          className="h-12 min-w-0 gap-2 bg-butter px-4 text-[15px] font-bold text-ink hover:bg-butter-hover sm:px-5"
                        >
                          {form.saving === "publish" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                          <span className="truncate">{form.saving === "publish" ? t("nav.publishing") : t("nav.publish")}</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        {skippable && !filledHere && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={form.next}
                            className="h-12 shrink-0 px-3.5 text-[15px] font-semibold sm:px-4"
                          >
                            {t("nav.skip")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          disabled={!filledHere}
                          onClick={form.next}
                          className="h-12 min-w-0 flex-1 gap-2 bg-brand px-4 text-[15px] font-bold text-ink hover:bg-brand-hover sm:flex-none sm:px-5"
                        >
                          <span className="truncate">{t("nav.next", { step: t(`steps.${nextStep}`) })}</span>
                          <ArrowRight className="size-4" aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isLast && form.missing.length > 0 && (
                  <p className="text-right text-[13px] text-muted-ink">
                    {t("nav.publishHint", { count: form.missing.length })}
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="sticky top-0 hidden w-80 shrink-0 flex-col gap-2.5 xl:flex">
            <div>
              <h2 className="text-[15px] font-bold text-ink">{t("preview.title")}</h2>
              <p className="text-[13px] text-muted-ink">{t("preview.subtitle")}</p>
            </div>
            <CreateEventPreview form={form} />
          </aside>
        </div>
      </div>

      {previewOpen && (
        <Drawer open onClose={() => setPreviewOpen(false)} title={t("preview.title")}>
          <CreateEventPreview form={form} />
        </Drawer>
      )}

      {ticketWizard && (
        <TicketPlanWizard
          initialPlan={ticketWizard.plan}
          startStep={ticketWizard.step}
          eventStartDate={form.startAt.slice(0, 10)}
          mode="create"
          onClose={() => setTicketWizard(null)}
          onFinish={async (plan) => {
            form.applyTicketPlan(plan);
            setTicketWizard(null);
            return null;
          }}
        />
      )}
    </div>
  );
}

/** 左邊的步驟列（桌機）：每一步的答案、跳過的標「之後再填」 */
function StepRail({ form }: { form: UseCreateEventReturn }) {
  const t = useTranslations("createEvent");
  const answers = useStepAnswers(form);
  return (
    <nav aria-label={t("rail.label")} className="sticky top-0 hidden w-56 shrink-0 flex-col gap-0.5 lg:flex">
      {CREATE_STEPS.map((s, i) => {
        const current = i === form.idx;
        const visited = i <= form.furthest;
        const filled = form.filled[s];
        const optionalKind = s !== "review" && STEP_KIND[s] !== "required";
        const later = !current && visited && !filled && optionalKind;
        const done = !current && visited && filled && s !== "review";
        const sub =
          s === "review"
            ? visited
              ? form.missing.length > 0
                ? t("nav.publishHint", { count: form.missing.length })
                : t("review.readyTitle")
              : t("rail.notYet")
            : current
              ? filled
                ? answers[s]
                : t("rail.filling")
              : later
                ? t("rail.later")
                : done
                  ? answers[s]
                  : t("rail.notYet");
        return (
          <button
            key={s}
            type="button"
            onClick={() => form.goTo(s)}
            disabled={!form.canJumpTo(s)}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left cursor-pointer disabled:cursor-default",
              current ? "bg-white ring-1 ring-inset ring-card-border" : "enabled:hover:bg-white/60"
            )}
          >
            <span
              className={cn(
                "mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                current
                  ? "bg-ink text-white"
                  : done
                    ? "bg-brand text-ink"
                    : later
                      ? "border-2 border-dashed border-butter bg-white text-butter-ink"
                      : "bg-hairline text-muted-ink"
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : <span>{i + 1}</span>}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-ink">{t(`steps.${s}`)}</span>
              <span className={cn("truncate text-xs", later ? "font-semibold text-butter-ink" : "text-muted-ink")}>
                {sub}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
