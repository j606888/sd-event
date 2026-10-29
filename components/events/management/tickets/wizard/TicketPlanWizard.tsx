"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Loader2, MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  compileTicketPlan,
  planSteps,
  type PlanStep,
  type TicketPlan,
} from "@/lib/ticket-plan";
import { cn } from "@/lib/utils";
import { dayDateLabels, money, planProblems } from "./plan-view";
import {
  ClassesStep,
  DayStep,
  EntryStep,
  FullStep,
  PartyStep,
  ReviewStep,
  SpecialStep,
  TiersStep,
  TypeStep,
  useTierFields,
  type StepProps,
} from "./WizardSteps";

type TicketPlanWizardProps = {
  initialPlan: TicketPlan;
  startStep: PlanStep;
  /** 活動第一天 "YYYY-MM-DD"（還沒填就是空字串） */
  eventStartDate: string;
  mode: "create" | "edit";
  onClose: () => void;
  /** 套用答案；回傳錯誤訊息，成功回 null */
  onFinish: (plan: TicketPlan) => Promise<string | null>;
};

/**
 * 售票精靈：一問一答建立票券。全螢幕蓋在活動表單上（portal 到 body，
 * 這樣裡面按 Enter 不會送出外層的活動表單）。
 */
export function TicketPlanWizard({
  initialPlan,
  startStep,
  eventStartDate,
  mode,
  onClose,
  onFinish,
}: TicketPlanWizardProps) {
  const t = useTranslations("ticketWizard");
  const locale = useLocale();
  const [plan, setPlan] = useState<TicketPlan>(initialPlan);
  const [stepKey, setStepKey] = useState<PlanStep>(startStep);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const steps = planSteps(plan.kind);
  const idx = Math.max(0, steps.indexOf(stepKey));
  const current = steps[idx];
  const isLast = idx === steps.length - 1;
  const dayDates = useMemo(() => dayDateLabels(eventStartDate, 7, locale), [eventStartDate, locale]);
  const tierFields = useTierFields(plan);
  const problems = planProblems(plan);
  const ticketCount = compileTicketPlan(plan).items.length;
  const dirty = useMemo(() => JSON.stringify(plan) !== JSON.stringify(initialPlan), [plan, initialPlan]);

  // 蓋住整個畫面時鎖住底下頁面的捲動
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 換步驟：捲回頂端、把焦點移到題目（鍵盤與讀屏使用者知道換頁了）
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [current]);

  const go = (step: PlanStep) => {
    setHelpOpen(false);
    setError(null);
    setStepKey(step);
  };

  const stepLabel = (step: PlanStep) =>
    step === "party" && plan.kind === "party" ? t("steps.partyEntry") : t(`steps.${step}`);

  const close = () => {
    if (dirty && !window.confirm(t("header.discardConfirm"))) return;
    onClose();
  };

  const finish = async () => {
    if (problems.length > 0) return;
    setSaving(true);
    setError(null);
    const message = await onFinish(plan);
    setSaving(false);
    if (message) setError(message);
  };

  const stepProps: StepProps = { plan, update: (fn) => setPlan((p) => fn(p)), dayDates, tierFields, goTo: go };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-wizard-title"
      className="fixed inset-0 z-[100] flex flex-col bg-paper"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-hairline bg-white px-2 py-1.5 sm:px-4">
        <button
          type="button"
          onClick={close}
          aria-label={t("header.close")}
          className="flex size-11 items-center justify-center rounded-lg text-ink hover:bg-gray-100 cursor-pointer"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 id="ticket-wizard-title" className="font-display text-base font-bold text-ink">
            {t("header.title")}
          </h1>
          <p className="text-xs text-muted-ink lg:hidden">
            {t("stepOf", { n: idx + 1, total: steps.length })} · {stepLabel(current)}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 py-5 md:px-6 md:py-7">
          {/* 步驟列（桌機） */}
          <nav aria-label={t("header.rail")} className="hidden w-60 shrink-0 flex-col gap-0.5 lg:flex">
            <p className="mb-2 ml-3 text-xs font-bold tracking-wide text-muted-ink">{t("header.rail")}</p>
            {steps.map((step, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => go(step)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left cursor-pointer",
                    active ? "bg-white ring-1 ring-inset ring-card-border" : "hover:bg-white/60"
                  )}
                >
                  <span
                    className={cn(
                      "mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      done ? "bg-brand text-ink" : active ? "bg-ink text-white" : "bg-hairline text-muted-ink"
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold text-ink">{stepLabel(step)}</span>
                    <span className="truncate text-xs text-muted-ink">
                      {i <= idx ? railAnswer(step, plan, t) : t("notYet")}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* 題目 */}
          <main className="min-w-0 flex-[999_1_32rem]">
            <section className="surface-card flex flex-col gap-6 px-5 pb-5 pt-5 md:px-7 md:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-brand-strong">
                  {t("stepOf", { n: idx + 1, total: steps.length })}
                </span>
                <button
                  type="button"
                  onClick={() => setHelpOpen((v) => !v)}
                  aria-expanded={helpOpen}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white pl-2.5 pr-3.5 text-sm font-medium text-ink ring-1 ring-inset ring-card-border hover:bg-paper cursor-pointer"
                >
                  <CircleHelp className="size-[18px] text-brand-strong" aria-hidden />
                  {t("help.button")}
                </button>
              </div>

              {helpOpen && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-brand-soft px-4 py-4">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-bold text-ink">{t("help.title")}</p>
                    <p className="mt-1 text-sm text-gray-700">{t("help.body")}</p>
                  </div>
                  <a
                    href="https://ig.me/m/damn.dingding"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    {t("help.cta")}
                  </a>
                </div>
              )}

              <div ref={headingRef} tabIndex={-1} className="outline-none">
                {current === "type" && <TypeStep {...stepProps} />}
                {current === "tiers" && <TiersStep {...stepProps} />}
                {current === "full" && <FullStep {...stepProps} />}
                {current === "day" && <DayStep {...stepProps} />}
                {current === "classes" && <ClassesStep {...stepProps} />}
                {current === "party" &&
                  (plan.kind === "party" ? <EntryStep {...stepProps} /> : <PartyStep {...stepProps} />)}
                {current === "special" && <SpecialStep {...stepProps} />}
                {current === "review" && <ReviewStep {...stepProps} />}
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={idx === 0}
                  onClick={() => go(steps[idx - 1])}
                  className="h-12 gap-2 px-3 text-[15px] font-semibold"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  {t("nav.back")}
                </Button>
                {isLast ? (
                  <Button
                    type="button"
                    disabled={saving || problems.length > 0}
                    onClick={finish}
                    className="h-12 gap-2 bg-ink px-5 text-[15px] font-bold text-white hover:bg-ink/90"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                    {saving
                      ? t("nav.saving")
                      : t(mode === "create" ? "nav.finishCreate" : "nav.finishEdit", { count: ticketCount })}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => go(steps[idx + 1])}
                    className="h-12 gap-2 bg-brand px-5 text-[15px] font-bold text-ink hover:bg-brand-hover"
                  >
                    {t("nav.next", { step: stepLabel(steps[idx + 1]) })}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </section>
          </main>

          {/* 目前的售票方案：照步驟順序長出來 */}
          <aside className="w-full lg:w-80 lg:shrink-0">
            <PlanSummary plan={plan} steps={steps} idx={idx} />
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
}

type Translate = ReturnType<typeof useTranslations<"ticketWizard">>;

/** 步驟列每一步下面的小字（已回答的答案） */
function railAnswer(step: PlanStep, plan: TicketPlan, t: Translate): string {
  const count = (n: number) => t("rail.tickets", { count: n });
  switch (step) {
    case "type": {
      const kind = t(`type.${plan.kind}`);
      return plan.kind === "party" ? kind : t("summary.eventValue", { kind, days: plan.days });
    }
    case "tiers":
      return plan.tiered ? t("rail.tiers", { count: plan.tiers.length }) : t("rail.singlePrice");
    case "full":
      return plan.full.enabled ? count(1) : t("summary.notSold");
    case "day":
      return plan.day.enabled ? count(plan.day.tickets.length) : t("summary.notSold");
    case "classes":
      return plan.classes.enabled ? count(plan.classes.tickets.length) : t("summary.notSold");
    case "party":
      if (plan.kind === "party") return count(plan.entry.tickets.length);
      return plan.parties.enabled ? count(plan.parties.tickets.length) : t("summary.notSold");
    case "special": {
      const list = [
        plan.pair.enabled && t("special.pairTitle"),
        plan.early.enabled && t("special.earlyTitle"),
        plan.coupon.enabled && t("special.couponTitle"),
      ].filter(Boolean);
      return list.length ? list.join("、") : t("rail.none");
    }
    default:
      return "";
  }
}

type Section = {
  id: string;
  title: string;
  dot: string;
  current: boolean;
  rows: { name: string; value: string }[];
  text?: string;
  muted?: boolean;
};

/** 右側「目前的售票方案」：只顯示已經走到的步驟，照順序一段段長出來 */
function PlanSummary({ plan, steps, idx }: { plan: TicketPlan; steps: PlanStep[]; idx: number }) {
  const t = useTranslations("ticketWizard");
  const current = steps[idx];
  const reached = (step: PlanStep) => {
    const i = steps.indexOf(step);
    return i !== -1 && i <= idx;
  };
  const price = (prices: number[]) =>
    plan.tiered && prices.length > 1 ? t("summary.from", { price: money(prices[0]) }) : money(prices[0] ?? 0);
  const name = (n: string, fallback: string) => n.trim() || fallback;

  const sections: Section[] = [];
  const add = (s: Omit<Section, "current">, stepsOf: PlanStep[]) =>
    sections.push({ ...s, current: stepsOf.includes(current) });

  add(
    {
      id: "event",
      title: t("summary.event"),
      dot: "ring-2 ring-inset ring-gray-300",
      rows: [],
      text:
        plan.kind === "party"
          ? t("type.party")
          : t("summary.eventValue", { kind: t(`type.${plan.kind}`), days: plan.days }),
    },
    ["type"]
  );
  if (reached("tiers")) {
    add(
      plan.tiered
        ? {
            id: "tiers",
            title: t("steps.tiers"),
            dot: "ring-2 ring-inset ring-gray-300",
            rows: plan.tiers.map((tier, i) => ({ name: tier.name || "—", value: tierSub(plan, i, t) })),
          }
        : {
            id: "tiers",
            title: t("steps.tiers"),
            dot: "ring-2 ring-inset ring-gray-300",
            rows: [],
            text: t("summary.singlePrice"),
          },
      ["tiers"]
    );
  }
  const specialRows = (main: boolean) => [
    ...(reached("special") && plan.pair.enabled && main
      ? [{ name: plan.pair.ticket.name, value: price(plan.pair.ticket.prices) }]
      : []),
    ...(reached("special") && plan.early.enabled && plan.tiered && main
      ? [{ name: plan.early.ticket.name, value: money(plan.early.ticket.prices[0] ?? 0) }]
      : []),
  ];
  if (plan.kind === "party") {
    if (reached("party")) {
      add(
        {
          id: "entry",
          title: plan.groupTitles.entry,
          dot: "bg-ink",
          rows: [
            ...plan.entry.tickets.map((tk) => ({ name: name(tk.name, t("entry.untitled")), value: price(tk.prices) })),
            ...specialRows(true),
          ],
        },
        ["party", "special"]
      );
    }
  } else {
    if (reached("full")) {
      add(
        {
          id: "full",
          title: plan.groupTitles.full,
          dot: "bg-ink",
          rows: plan.full.enabled
            ? [{ name: plan.full.ticket.name, value: price(plan.full.ticket.prices) }, ...specialRows(true)]
            : [],
          text: plan.full.enabled ? undefined : t("summary.notSold"),
          muted: true,
        },
        ["full", "special"]
      );
    }
    if (reached("day")) {
      add(
        {
          id: "day",
          title: plan.groupTitles.day,
          dot: "bg-brand",
          rows: plan.day.enabled
            ? plan.day.tickets.map((tk) => ({ name: tk.name, value: price(tk.prices) }))
            : [],
          text: plan.day.enabled ? undefined : t("summary.notSold"),
          muted: true,
        },
        ["day"]
      );
    }
    if (reached("classes")) {
      const rows: Section["rows"] = [];
      const notes: string[] = [];
      if (plan.classes.enabled) {
        plan.classes.tickets.forEach((tk) =>
          rows.push({ name: name(tk.name, t("classes.untitled")), value: price(tk.prices) })
        );
      } else {
        notes.push(t("summary.classesNotSold"));
      }
      if (reached("party")) {
        if (plan.parties.enabled) {
          plan.parties.tickets.forEach((tk) =>
            rows.push({ name: name(tk.name, t("party.untitled")), value: price(tk.prices) })
          );
        } else {
          notes.push(t("summary.partiesNotSold"));
        }
      }
      add(
        {
          id: "single",
          title: t("blocks.single"),
          dot: "bg-gray-400",
          rows,
          text: notes.length ? notes.join(" · ") : undefined,
          muted: true,
        },
        ["classes", "party"]
      );
    }
  }
  if (reached("special") && plan.coupon.enabled) {
    add(
      {
        id: "coupon",
        title: t("summary.coupon"),
        dot: "ring-2 ring-inset ring-gray-300",
        rows: [],
        text: t("summary.couponValue", { code: plan.coupon.code || "—", rate: plan.coupon.rate }),
      },
      ["special"]
    );
  }

  const ticketCount = sections.reduce((n, s) => n + (["tiers", "event"].includes(s.id) ? 0 : s.rows.length), 0);
  const remaining = steps.length - 1 - idx;

  return (
    <section className="surface-card px-5 pb-4 pt-4">
      <h2 className="text-[15px] font-bold text-ink">{t("summary.title")}</h2>
      <p className="mb-2.5 text-[13px] text-muted-ink">
        {ticketCount > 0 ? t("summary.count", { count: ticketCount }) : t("summary.growing")}
      </p>
      <div className="flex flex-col gap-1">
        {sections.map((s) => (
          <div key={s.id} className={cn("-mx-2.5 rounded-lg p-2.5", s.current && "bg-brand-soft")}>
            <div className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", s.dot)} />
              <span className="text-[13px] font-bold text-ink">{s.title}</span>
              {s.current && (
                <span className="ml-auto text-[11px] font-bold text-brand-strong">{t("summary.current")}</span>
              )}
            </div>
            {s.text && (
              <p className={cn("ml-[18px] mt-1 text-[13px]", s.muted ? "text-muted-ink" : "text-ink")}>{s.text}</p>
            )}
            {s.rows.map((row, i) => (
              <div key={i} className="ml-[18px] flex items-baseline justify-between gap-2.5 pt-1.5 text-[13px]">
                <span className="min-w-0 text-ink">{row.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <p className="mt-2.5 border-t border-dashed border-card-border pt-2.5 text-[13px] text-muted-ink">
          {t("summary.remaining", { count: remaining })}
        </p>
      )}
    </section>
  );
}

/** 摘要裡每段的期間：「～11/8」「11/9～11/29」「11/30 起」 */
function tierSub(plan: TicketPlan, i: number, t: Translate): string {
  const tier = plan.tiers[i];
  const prevEnd = i > 0 ? plan.tiers[i - 1].endsAt : "";
  const md = (date: string) => {
    const [, m, d] = date.split("-").map(Number);
    return m && d ? `${m}/${d}` : "";
  };
  const next = (date: string) =>
    new Date(new Date(`${date}T12:00:00+08:00`).getTime() + 86_400_000).toISOString().slice(0, 10);
  if (i === plan.tiers.length - 1) return prevEnd ? t("tiers.fromDate", { date: md(next(prevEnd)) }) : "";
  if (!tier.endsAt) return "";
  return prevEnd
    ? t("tiers.fromTo", { from: md(next(prevEnd)), to: md(tier.endsAt) })
    : t("tiers.untilDate", { date: md(tier.endsAt) });
}
