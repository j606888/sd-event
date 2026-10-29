"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  alignPlanPrices,
  newFlatTicket,
  pairPrice,
  spliceTierPrices,
  syncDayPasses,
  type PlanEventKind,
  type PlanStep,
  type PlanTicket,
  type TicketPlan,
} from "@/lib/ticket-plan";
import { cn } from "@/lib/utils";
import { PlanBlocks, PlanPaths } from "./PlanBlocks";
import { newPlanKey, planProblems, shortDate } from "./plan-view";
import {
  AddRowButton,
  CheckRow,
  ChoicePair,
  EditableRow,
  OptionCard,
  PriceInput,
  RemoveRowButton,
  RuleBox,
  RuleNote,
  SkippedNote,
  StepIntro,
  TierPriceFields,
  WizardInput,
} from "./WizardControls";

export type Update = (fn: (plan: TicketPlan) => TicketPlan) => void;

export type StepProps = {
  plan: TicketPlan;
  update: Update;
  /** 從活動第一天起每一天的顯示日期（最多 7 天；Day Pass 的說明用） */
  dayDates: string[];
  /** 票價欄位的標題與期間（不分階段時只有「價格」一格） */
  tierFields: { name: string; sub?: string }[];
  goTo: (step: PlanStep) => void;
};

/** 雙人票價格跟著主票（Full Pass／入場票）與折數重算 */
function withPairPrices(plan: TicketPlan): TicketPlan {
  const base = plan.kind === "party" ? plan.entry.tickets[0] : plan.full.ticket;
  if (!base) return plan;
  return {
    ...plan,
    pair: {
      ...plan.pair,
      ticket: { ...plan.pair.ticket, prices: base.prices.map((p) => pairPrice(p, plan.pair.rate)) },
    },
  };
}

function updateTicket(list: PlanTicket[], key: string, patch: Partial<PlanTicket>): PlanTicket[] {
  return list.map((t) => (t.key === key ? { ...t, ...patch } : t));
}

/** 折數輸入（9、8.5）；可以先清空再打 */
function RateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <WizardInput
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft ?? String(value)}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d.]/g, "").slice(0, 4);
        setDraft(next);
        const n = Number(next);
        if (next && Number.isFinite(n) && n > 0 && n < 10) onChange(n);
      }}
      onBlur={() => setDraft(null)}
      className="w-16 bg-white text-center font-semibold"
    />
  );
}

// ============ 1. 活動型態 ============

export function TypeStep({ plan, update, dayDates }: StepProps) {
  const t = useTranslations("ticketWizard");
  const pick = (kind: PlanEventKind) =>
    update((p) => {
      const mainName = kind === "party" ? p.entry.tickets[0]?.name ?? "" : p.full.ticket.name;
      return withPairPrices({
        ...p,
        kind,
        pair: { ...p.pair, ticket: { ...p.pair.ticket, name: t("labels.pairName", { name: mainName }) } },
      });
    });
  const setDays = (days: number) =>
    update((p) => {
      const next = syncDayPasses({ ...p, days }, dayDates, (n) => t("labels.dayPass", { n }));
      return {
        ...next,
        classes: {
          ...next.classes,
          tickets: next.classes.tickets.map((c) => (c.day != null && c.day > days ? { ...c, day: days } : c)),
        },
      };
    });
  const kinds: { kind: PlanEventKind; title: string; desc: string }[] = [
    { kind: "workshop", title: t("type.workshop"), desc: t("type.workshopDescription") },
    { kind: "party", title: t("type.party"), desc: t("type.partyDescription") },
    { kind: "festival", title: t("type.festival"), desc: t("type.festivalDescription") },
  ];
  return (
    <div className="flex flex-col gap-7">
      <StepIntro title={t("type.title")} description={t("type.description")} />
      <div role="radiogroup" aria-label={t("steps.type")} className="grid gap-3 sm:grid-cols-3">
        {kinds.map((k) => (
          <OptionCard
            key={k.kind}
            kind="radio"
            selected={plan.kind === k.kind}
            onClick={() => pick(k.kind)}
            title={k.title}
            description={k.desc}
          />
        ))}
      </div>
      {plan.kind !== "party" && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-ink">{t("type.daysTitle")}</h3>
              <p className="text-sm text-muted-ink">{t("type.daysDescription")}</p>
            </div>
            <div
              role="group"
              aria-label={t("type.daysTitle")}
              className="inline-flex items-center overflow-hidden rounded-lg ring-1 ring-inset ring-card-border"
            >
              <button
                type="button"
                aria-label={t("type.fewerDays")}
                disabled={plan.days <= 1}
                onClick={() => setDays(plan.days - 1)}
                className="flex size-11 items-center justify-center text-ink hover:bg-paper disabled:opacity-40 cursor-pointer"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-16 text-center font-bold text-ink">
                {t("type.daysValue", { count: plan.days })}
              </span>
              <button
                type="button"
                aria-label={t("type.moreDays")}
                disabled={plan.days >= 7}
                onClick={() => setDays(plan.days + 1)}
                className="flex size-11 items-center justify-center text-ink hover:bg-paper disabled:opacity-40 cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: plan.days }, (_, i) => (
              <span key={i} className="rounded-full bg-field px-3 py-1.5 text-[13px] font-medium text-ink">
                {dayDates[i]
                  ? t("type.dayWithDate", { n: i + 1, date: dayDates[i] })
                  : t("type.day", { n: i + 1 })}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 2. 票價階段 ============

const TIMELINE_TONES = ["bg-brand-strong text-white", "bg-brand text-ink", "bg-brand-soft text-ink"];

export function TiersStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const datesOk = !planProblems(plan).some((p) => p.key === "tierDates");
  const setTiered = (tiered: boolean) => update((p) => withPairPrices(alignPlanPrices({ ...p, tiered })));
  const setTier = (index: number, patch: { name?: string; endsAt?: string }) =>
    update((p) => ({ ...p, tiers: p.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)) }));
  const addTier = () =>
    update((p) => {
      const at = p.tiers.length - 1;
      const next = spliceTierPrices(p, at, "insert");
      const tiers = [...p.tiers];
      tiers.splice(at, 0, { key: newPlanKey(), name: "", endsAt: "" });
      return withPairPrices({ ...next, tiers, early: { ...p.early, tierIndex: Math.min(p.early.tierIndex, at) } });
    });
  const removeTier = (index: number) =>
    update((p) => {
      const next = spliceTierPrices(p, index, "remove");
      const tiers = p.tiers.filter((_, i) => i !== index);
      return withPairPrices(alignPlanPrices({ ...next, tiers }));
    });

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("tiers.title")} description={t("tiers.description")} />
      <ChoicePair
        value={plan.tiered}
        onChange={setTiered}
        yesLabel={t("tiers.yes")}
        noLabel={t("tiers.no")}
        ariaLabel={t("tiers.title")}
      />
      {plan.tiered ? (
        <div className="flex flex-col gap-4">
          <div aria-hidden className="flex gap-1 overflow-hidden rounded-xl">
            {plan.tiers.map((tier, i) => (
              <div
                key={tier.key}
                className={cn(
                  "min-w-0 flex-1 px-3 py-2.5",
                  TIMELINE_TONES[Math.min(i, TIMELINE_TONES.length - 1)]
                )}
              >
                <div className="truncate text-[13px] font-bold">{tier.name || "—"}</div>
                <div className="truncate text-xs">{tierFields[i]?.sub}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {plan.tiers.map((tier, i) => {
              const last = i === plan.tiers.length - 1;
              return (
                <div key={tier.key} className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <WizardInput
                      aria-label={t("tiers.nameAria", { n: i + 1 })}
                      value={tier.name}
                      onChange={(e) => setTier(i, { name: e.target.value })}
                      className="min-w-0 flex-1 basis-48"
                    />
                    {last ? (
                      <span className="flex-1 basis-56 text-sm text-muted-ink">{t("tiers.lastNote")}</span>
                    ) : (
                      <label className="flex flex-1 basis-56 items-center gap-2 text-sm text-muted-ink">
                        <span className="shrink-0">{t("tiers.endsLabel")}</span>
                        <WizardInput
                          type="date"
                          aria-label={t("tiers.endsAria", { n: i + 1 })}
                          value={tier.endsAt}
                          onChange={(e) => setTier(i, { endsAt: e.target.value })}
                          className="min-w-0 flex-1"
                        />
                      </label>
                    )}
                  </div>
                  {plan.tiers.length > 2 && !last ? (
                    <RemoveRowButton onClick={() => removeTier(i)} label={t("tiers.remove", { n: i + 1 })} />
                  ) : (
                    <span className="size-11 shrink-0" aria-hidden />
                  )}
                </div>
              );
            })}
            {!datesOk && (
              <p className="text-sm font-medium text-red-600">{t("review.tierDates")}</p>
            )}
            {plan.tiers.length < 6 && <AddRowButton onClick={addTier}>{t("tiers.add")}</AddRowButton>}
          </div>
        </div>
      ) : (
        <SkippedNote>{t("tiers.single")}</SkippedNote>
      )}
    </div>
  );
}

// ============ 3. Full Pass ============

export function FullStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const { full } = plan;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("full.title")} description={t("full.description")} />
      <ChoicePair
        value={full.enabled}
        onChange={(enabled) => update((p) => ({ ...p, full: { ...p.full, enabled } }))}
        yesLabel={t("full.yes")}
        noLabel={t("full.no")}
        ariaLabel={t("full.title")}
      />
      {full.enabled ? (
        <div className="flex flex-col gap-6">
          <label className="flex max-w-sm flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">{t("full.nameLabel")}</span>
            <WizardInput
              value={full.ticket.name}
              onChange={(e) =>
                update((p) => ({ ...p, full: { ...p.full, ticket: { ...p.full.ticket, name: e.target.value } } }))
              }
            />
          </label>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-semibold text-ink">{t("full.includesParty")}</span>
            <ChoicePair
              size="md"
              value={full.includesParty}
              onChange={(includesParty) => update((p) => ({ ...p, full: { ...p.full, includesParty } }))}
              yesLabel={t("full.includesYes")}
              noLabel={t("full.includesNo")}
              ariaLabel={t("full.includesParty")}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-semibold text-ink">{t("full.pricesLabel")}</span>
            <TierPriceFields
              tiers={tierFields}
              prices={full.ticket.prices}
              ticketName={full.ticket.name}
              onChange={(prices) =>
                update((p) => withPairPrices({ ...p, full: { ...p.full, ticket: { ...p.full.ticket, prices } } }))
              }
            />
            {plan.tiered && <p className="text-[13px] text-muted-ink">{t("full.pricesHint")}</p>}
          </div>
        </div>
      ) : (
        <SkippedNote>{t("full.skipped")}</SkippedNote>
      )}
    </div>
  );
}

// ============ 4. Day Pass ============

export function DayStep({ plan, update, dayDates, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const { day } = plan;
  const setEnabled = (enabled: boolean) =>
    update((p) =>
      syncDayPasses({ ...p, day: { ...p.day, enabled } }, dayDates, (n) => t("labels.dayPass", { n }))
    );
  const setPrices = (key: string, prices: number[]) =>
    update((p) => ({
      ...p,
      day: {
        ...p.day,
        tickets: p.day.samePrice
          ? p.day.tickets.map((tk) => ({ ...tk, prices }))
          : updateTicket(p.day.tickets, key, { prices }),
      },
    }));
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("day.title")} description={t("day.description", { days: plan.days })} />
      <ChoicePair
        value={day.enabled}
        onChange={setEnabled}
        yesLabel={t("day.yes")}
        noLabel={t("day.no")}
        ariaLabel={t("day.title")}
      />
      {day.enabled ? (
        <div className="flex flex-col gap-3">
          <CheckRow
            checked={day.samePrice}
            onChange={(samePrice) =>
              update((p) => ({
                ...p,
                day: {
                  ...p.day,
                  samePrice,
                  tickets: samePrice
                    ? p.day.tickets.map((tk) => ({ ...tk, prices: p.day.tickets[0]?.prices ?? tk.prices }))
                    : p.day.tickets,
                },
              }))
            }
          >
            {t("day.samePrice")}
          </CheckRow>
          {day.tickets.map((ticket) => (
            <div key={ticket.key} className="flex flex-col gap-2.5 rounded-xl p-4 ring-1 ring-inset ring-hairline">
              <div className="flex flex-wrap items-center gap-2">
                <WizardInput
                  aria-label={t("full.nameLabel")}
                  value={ticket.name}
                  onChange={(e) =>
                    update((p) => ({ ...p, day: { ...p.day, tickets: updateTicket(p.day.tickets, ticket.key, { name: e.target.value }) } }))
                  }
                  className="max-w-56 font-semibold"
                />
                {ticket.note && <span className="text-[13px] text-muted-ink">{ticket.note}</span>}
              </div>
              <TierPriceFields
                compact
                tiers={tierFields}
                prices={ticket.prices}
                ticketName={ticket.name}
                onChange={(prices) => setPrices(ticket.key, prices)}
              />
            </div>
          ))}
          {plan.full.enabled && (
            <RuleBox>
              <RuleNote lock>
                <strong className="font-bold">{t("rules.auto")}</strong>
                {t("rules.fullLocksDay")}
              </RuleNote>
            </RuleBox>
          )}
        </div>
      ) : (
        <SkippedNote>{t("day.skipped")}</SkippedNote>
      )}
    </div>
  );
}

// ============ 5. 單堂課 ============

export function ClassesStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const { classes } = plan;
  const setTickets = (fn: (tickets: PlanTicket[]) => PlanTicket[]) =>
    update((p) => ({ ...p, classes: { ...p.classes, tickets: fn(p.classes.tickets) } }));
  const addClass = () =>
    update((p) => ({
      ...p,
      classes: {
        ...p.classes,
        tickets: [...p.classes.tickets, { ...newFlatTicket(p, "classes", newPlanKey()), day: p.days > 1 ? 1 : undefined }],
      },
    }));
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("classes.title")} description={t("classes.description")} />
      <ChoicePair
        value={classes.enabled}
        onChange={(enabled) =>
          update((p) => {
            const next = { ...p, classes: { ...p.classes, enabled } };
            return enabled && next.classes.tickets.length === 0
              ? {
                  ...next,
                  classes: {
                    ...next.classes,
                    tickets: [{ ...newFlatTicket(next, "classes", newPlanKey()), day: p.days > 1 ? 1 : undefined }],
                  },
                }
              : next;
          })
        }
        yesLabel={t("classes.yes")}
        noLabel={t("classes.no")}
        ariaLabel={t("classes.title")}
      />
      {classes.enabled ? (
        <div className="flex flex-col gap-2.5">
          {classes.tickets.length === 0 && <p className="text-sm text-muted-ink">{t("classes.empty")}</p>}
          {classes.tickets.map((ticket) => (
            <EditableRow
              key={ticket.key}
              onRemove={() => setTickets((list) => list.filter((x) => x.key !== ticket.key))}
              removeLabel={t("classes.remove", { name: ticket.name || t("classes.untitled") })}
            >
              {plan.days > 1 && (
                <select
                  aria-label={t("classes.dayAria")}
                  value={ticket.day ?? 1}
                  onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { day: Number(e.target.value) }))}
                  className="h-11 w-24 shrink-0 rounded-md bg-field px-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-brand/30 md:text-sm"
                >
                  {Array.from({ length: plan.days }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {t("type.day", { n: i + 1 })}
                    </option>
                  ))}
                </select>
              )}
              <WizardInput
                aria-label={t("classes.nameAria")}
                placeholder={t("classes.namePlaceholder")}
                value={ticket.name}
                onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { name: e.target.value }))}
                className="min-w-0 flex-1 basis-36"
              />
              <WizardInput
                aria-label={t("classes.timeAria")}
                placeholder={t("classes.timePlaceholder")}
                value={ticket.note}
                onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { note: e.target.value }))}
                className="min-w-0 flex-1 basis-28 sm:max-w-32"
              />
              {ticket.prices.length === 1 ? (
                <PriceInput
                  value={ticket.prices[0]}
                  ariaLabel={`${ticket.name || t("classes.untitled")} · ${t("full.priceLabel")}`}
                  onChange={(v) => setTickets((list) => updateTicket(list, ticket.key, { prices: [v] }))}
                  className="w-28 shrink-0"
                />
              ) : (
                <div className="w-full">
                  <TierPriceFields
                    compact
                    tiers={tierFields}
                    prices={ticket.prices}
                    ticketName={ticket.name || t("classes.untitled")}
                    onChange={(prices) => setTickets((list) => updateTicket(list, ticket.key, { prices }))}
                  />
                </div>
              )}
            </EditableRow>
          ))}
          <AddRowButton onClick={addClass}>{t("classes.add")}</AddRowButton>
          {plan.tiered && (
            <CheckRow
              checked={classes.tiered}
              onChange={(tiered) => update((p) => alignPlanPrices({ ...p, classes: { ...p.classes, tiered } }))}
            >
              {t("classes.tiered")}
            </CheckRow>
          )}
          {(plan.full.enabled || plan.day.enabled) && (
            <RuleBox>
              {plan.full.enabled && (
                <RuleNote lock>
                  <strong className="font-bold">{t("rules.auto")}</strong>
                  {t("rules.fullLocksClasses")}
                </RuleNote>
              )}
              {plan.day.enabled && <RuleNote>{t("rules.dayPlusClasses")}</RuleNote>}
            </RuleBox>
          )}
        </div>
      ) : (
        <SkippedNote>{t("classes.skipped")}</SkippedNote>
      )}
    </div>
  );
}

// ============ 6a. Party 票（Workshop／Festival） ============

export function PartyStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const { parties } = plan;
  const setTickets = (fn: (tickets: PlanTicket[]) => PlanTicket[]) =>
    update((p) => ({ ...p, parties: { ...p.parties, tickets: fn(p.parties.tickets) } }));
  const addParty = () =>
    update((p) => ({
      ...p,
      parties: { ...p.parties, tickets: [...p.parties.tickets, newFlatTicket(p, "parties", newPlanKey())] },
    }));
  const fullHasParty = plan.full.enabled && plan.full.includesParty;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("party.title")} description={t("party.description")} />
      <ChoicePair
        value={parties.enabled}
        onChange={(enabled) =>
          update((p) => {
            const next = { ...p, parties: { ...p.parties, enabled } };
            return enabled && next.parties.tickets.length === 0
              ? { ...next, parties: { ...next.parties, tickets: [newFlatTicket(next, "parties", newPlanKey())] } }
              : next;
          })
        }
        yesLabel={t("party.yes")}
        noLabel={t("party.no")}
        ariaLabel={t("party.title")}
      />
      {parties.enabled ? (
        <div className="flex flex-col gap-2.5">
          {parties.tickets.length === 0 && <p className="text-sm text-muted-ink">{t("party.empty")}</p>}
          {parties.tickets.map((ticket) => (
            <EditableRow
              key={ticket.key}
              onRemove={() => setTickets((list) => list.filter((x) => x.key !== ticket.key))}
              removeLabel={t("party.remove", { name: ticket.name || t("party.untitled") })}
            >
              <WizardInput
                aria-label={t("party.nameAria")}
                placeholder={t("party.namePlaceholder")}
                value={ticket.name}
                onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { name: e.target.value }))}
                className="min-w-0 flex-1 basis-40"
              />
              <WizardInput
                aria-label={t("party.whenAria")}
                placeholder={t("party.whenPlaceholder")}
                value={ticket.note}
                onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { note: e.target.value }))}
                className="min-w-0 flex-1 basis-32 sm:max-w-40"
              />
              {ticket.prices.length === 1 ? (
                <PriceInput
                  value={ticket.prices[0]}
                  ariaLabel={`${ticket.name || t("party.untitled")} · ${t("full.priceLabel")}`}
                  onChange={(v) => setTickets((list) => updateTicket(list, ticket.key, { prices: [v] }))}
                  className="w-28 shrink-0"
                />
              ) : (
                <div className="w-full">
                  <TierPriceFields
                    compact
                    tiers={tierFields}
                    prices={ticket.prices}
                    ticketName={ticket.name || t("party.untitled")}
                    onChange={(prices) => setTickets((list) => updateTicket(list, ticket.key, { prices }))}
                  />
                </div>
              )}
            </EditableRow>
          ))}
          <AddRowButton onClick={addParty}>{t("party.add")}</AddRowButton>
          {plan.tiered && (
            <CheckRow
              checked={parties.tiered}
              onChange={(tiered) => update((p) => alignPlanPrices({ ...p, parties: { ...p.parties, tiered } }))}
            >
              {t("party.tiered")}
            </CheckRow>
          )}
          <RuleBox>
            {fullHasParty ? (
              <RuleNote lock>
                <strong className="font-bold">{t("rules.auto")}</strong>
                {t("rules.fullLocksParty")}
              </RuleNote>
            ) : (
              <RuleNote>{t("rules.partyAddOn")}</RuleNote>
            )}
          </RuleBox>
        </div>
      ) : (
        <SkippedNote>{t("party.skipped")}</SkippedNote>
      )}
    </div>
  );
}

// ============ 6b. 入場票（純 Party） ============

export function EntryStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const tickets = plan.entry.tickets;
  const setTickets = (fn: (tickets: PlanTicket[]) => PlanTicket[]) =>
    update((p) => withPairPrices({ ...p, entry: { tickets: fn(p.entry.tickets) } }));
  const addTicket = () =>
    update((p) => ({
      ...p,
      entry: {
        tickets: [
          ...p.entry.tickets,
          { key: newPlanKey(), name: "", note: "", prices: [...(p.entry.tickets[0]?.prices ?? [0])] },
        ],
      },
    }));
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("entry.title")} description={t("entry.description")} />
      {tickets.map((ticket, i) => (
        <div key={ticket.key} className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-inset ring-hairline">
          <div className="flex items-end gap-2">
            <label className="flex min-w-0 max-w-sm flex-1 flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">{t("entry.nameLabel")}</span>
              <WizardInput
                value={ticket.name}
                onChange={(e) => setTickets((list) => updateTicket(list, ticket.key, { name: e.target.value }))}
              />
            </label>
            {i > 0 && (
              <RemoveRowButton
                onClick={() => setTickets((list) => list.filter((x) => x.key !== ticket.key))}
                label={t("entry.remove", { name: ticket.name || t("entry.untitled") })}
              />
            )}
          </div>
          <TierPriceFields
            tiers={tierFields}
            prices={ticket.prices}
            ticketName={ticket.name || t("entry.untitled")}
            onChange={(prices) => setTickets((list) => updateTicket(list, ticket.key, { prices }))}
          />
        </div>
      ))}
      {tickets.length < 6 && <AddRowButton onClick={addTicket}>{t("entry.add")}</AddRowButton>}
    </div>
  );
}

// ============ 7. 特殊賣法 ============

export function SpecialStep({ plan, update, tierFields }: StepProps) {
  const t = useTranslations("ticketWizard");
  const { pair, early, coupon } = plan;
  const mainEnabled = plan.kind === "party" || plan.full.enabled;
  const mainName = plan.kind === "party" ? plan.entry.tickets[0]?.name ?? "" : plan.full.ticket.name;
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("special.title")} description={t("special.description")} />
      <div className="flex flex-col gap-3">
        <OptionCard
          kind="checkbox"
          selected={pair.enabled}
          onClick={() => update((p) => withPairPrices({ ...p, pair: { ...p.pair, enabled: !p.pair.enabled } }))}
          title={t("special.pairTitle")}
          description={t("special.pairDescription")}
        >
          {mainEnabled ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <span>{t("special.pairAppliesTo", { name: mainName })}</span>
                <RateInput
                  value={pair.rate}
                  ariaLabel={t("special.rateAria")}
                  onChange={(rate) => update((p) => withPairPrices({ ...p, pair: { ...p.pair, rate } }))}
                />
                <span>{t("special.pairRateSuffix")}</span>
              </div>
              <WizardInput
                aria-label={t("full.nameLabel")}
                value={pair.ticket.name}
                onChange={(e) =>
                  update((p) => ({ ...p, pair: { ...p.pair, ticket: { ...p.pair.ticket, name: e.target.value } } }))
                }
                className="max-w-sm bg-white"
              />
              <TierPriceFields
                compact
                tiers={tierFields}
                prices={pair.ticket.prices}
                inputClassName="bg-white"
                ticketName={pair.ticket.name}
                onChange={(prices) =>
                  update((p) => ({ ...p, pair: { ...p.pair, ticket: { ...p.pair.ticket, prices } } }))
                }
              />
              <p className="text-[13px] text-gray-700">{t("special.pairHint")}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{t("special.pairNeedsFull")}</p>
          )}
        </OptionCard>

        <OptionCard
          kind="checkbox"
          selected={early.enabled}
          onClick={() => update((p) => ({ ...p, early: { ...p.early, enabled: !p.early.enabled } }))}
          title={t("special.earlyTitle")}
          description={t("special.earlyDescription")}
        >
          {!plan.tiered ? (
            <p className="text-sm text-gray-700">{t("special.earlyNeedsTiers")}</p>
          ) : !mainEnabled ? (
            <p className="text-sm text-gray-700">{t("special.earlyNeedsFull")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <WizardInput
                  aria-label={t("special.earlyNameAria")}
                  value={early.ticket.name}
                  onChange={(e) =>
                    update((p) => ({ ...p, early: { ...p.early, ticket: { ...p.early.ticket, name: e.target.value } } }))
                  }
                  className="min-w-0 flex-1 basis-40 bg-white"
                />
                <span>{t("special.earlyOnly")}</span>
                <select
                  aria-label={t("special.earlyTierAria")}
                  value={early.tierIndex}
                  onChange={(e) => update((p) => ({ ...p, early: { ...p.early, tierIndex: Number(e.target.value) } }))}
                  className="h-11 rounded-md bg-white px-2.5 text-base text-ink outline-none ring-1 ring-inset ring-card-border focus:ring-2 focus:ring-brand/30 md:text-sm"
                >
                  {plan.tiers.slice(0, -1).map((tier, i) => (
                    <option key={tier.key} value={i}>
                      {tier.name}
                    </option>
                  ))}
                </select>
                <span>{t("special.earlySell")}</span>
                <PriceInput
                  value={early.ticket.prices[0] ?? 0}
                  ariaLabel={early.ticket.name}
                  onChange={(v) =>
                    update((p) => ({ ...p, early: { ...p.early, ticket: { ...p.early.ticket, prices: [v] } } }))
                  }
                  className="w-28 bg-white"
                />
                <span>{t("special.earlyPair")}</span>
              </div>
              <p className="text-[13px] text-gray-700">{t("special.earlyHint")}</p>
            </div>
          )}
        </OptionCard>

        <OptionCard
          kind="checkbox"
          selected={coupon.enabled}
          onClick={() => update((p) => ({ ...p, coupon: { ...p.coupon, enabled: !p.coupon.enabled } }))}
          title={t("special.couponTitle")}
          description={t("special.couponDescription")}
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <span>{t("special.couponCode")}</span>
              <WizardInput
                aria-label={t("special.couponCodeAria")}
                placeholder={t("special.couponCodePlaceholder")}
                value={coupon.code}
                onChange={(e) =>
                  update((p) => ({ ...p, coupon: { ...p.coupon, code: e.target.value.toUpperCase().slice(0, 32) } }))
                }
                className="w-36 bg-white font-semibold uppercase tracking-wide"
              />
              <span>{t("special.couponRate")}</span>
              <RateInput
                value={coupon.rate}
                ariaLabel={t("special.rateAria")}
                onChange={(rate) => update((p) => ({ ...p, coupon: { ...p.coupon, rate } }))}
              />
              <span>{t("special.couponRateSuffix")}</span>
              <WizardInput
                inputMode="numeric"
                aria-label={t("special.limitAria")}
                placeholder={t("special.couponLimitPlaceholder")}
                value={coupon.usageLimit == null ? "" : String(coupon.usageLimit)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 5);
                  update((p) => ({
                    ...p,
                    coupon: { ...p.coupon, usageLimit: digits && Number(digits) > 0 ? Number(digits) : null },
                  }));
                }}
                className="w-20 bg-white text-center"
              />
              <span>{t("special.couponLimitSuffix")}</span>
            </div>
            {planProblems(plan).some((p) => p.key === "couponCode") && coupon.code !== "" && (
              <p className="text-sm font-medium text-red-600">{t("review.couponCode")}</p>
            )}
          </div>
        </OptionCard>
      </div>
      <p className="text-sm text-muted-ink">
        {t("special.more")}{" "}
        <a
          href="https://ig.me/m/damn.dingding"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-strong underline-offset-2 hover:underline"
        >
          {t("special.moreLink")}
        </a>
      </p>
    </div>
  );
}

// ============ 8. 確認 ============

export function ReviewStep({ plan, goTo }: StepProps) {
  const t = useTranslations("ticketWizard");
  const problems = planProblems(plan);
  return (
    <div className="flex flex-col gap-7">
      <StepIntro title={t("review.title")} description={t("review.description")} />
      {problems.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-red-50 px-4 py-3.5 text-sm text-red-800">
          <p className="font-semibold">{t("review.problems")}</p>
          <ul className="flex flex-col gap-1.5">
            {problems.map((p) => (
              <li key={p.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{t(`review.${p.key}`)}</span>
                <button
                  type="button"
                  onClick={() => goTo(p.step)}
                  className="font-semibold text-red-900 underline underline-offset-2 cursor-pointer"
                >
                  {t("review.goFix")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {plan.kind !== "party" && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-base font-bold text-ink">{t("review.pathsTitle")}</h3>
          <PlanPaths plan={plan} />
        </section>
      )}
      <section className="flex flex-col gap-2.5">
        <h3 className="text-base font-bold text-ink">{t("review.pricesTitle")}</h3>
        <PlanBlocks plan={plan} onEdit={goTo} />
      </section>
    </div>
  );
}

/** 期間文字：「即日起～11/8」「11/9～11/29」「11/30 起」 */
export function useTierFields(plan: TicketPlan): { name: string; sub?: string }[] {
  const t = useTranslations("ticketWizard");
  if (!plan.tiered) return [{ name: t("full.priceLabel") }];
  return plan.tiers.map((tier, i) => {
    const last = i === plan.tiers.length - 1;
    const prevEnd = i > 0 ? plan.tiers[i - 1].endsAt : "";
    const from = prevEnd ? shortDate(nextDay(prevEnd)) : t("tiers.now");
    const sub = last
      ? prevEnd
        ? t("tiers.fromDate", { date: shortDate(nextDay(prevEnd)) })
        : undefined
      : tier.endsAt
        ? t("tiers.fromTo", { from, to: shortDate(tier.endsAt) })
        : undefined;
    return { name: tier.name || "—", sub };
  });
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00+08:00`);
  return new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10);
}
