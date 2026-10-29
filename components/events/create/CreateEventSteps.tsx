"use client";

import { useState } from "react";
import { CalendarDays, Check, ImageUp, Plus, Ticket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DescriptionEditor } from "@/components/events/management/DescriptionEditor";
import { LocationDrawer } from "@/components/events/management/LocationDrawer";
import { OrganizerDrawer } from "@/components/events/management/OrganizerDrawer";
import { BankInfoDrawer } from "@/components/events/management/BankInfoDrawer";
import { LinePayeeDrawer } from "@/components/events/management/LinePayeeDrawer";
import { ChoicePair, OptionCard, StepIntro } from "@/components/events/management/tickets/wizard/WizardControls";
import { dayDateLabels, money } from "@/components/events/management/tickets/wizard/plan-view";
import {
  CREATE_STEPS,
  DATE_PRESETS,
  TITLE_MAX_LENGTH,
  rangeSpan,
  type CreateStep,
} from "@/lib/create-event";
import { EVENT_TYPES } from "@/lib/event-templates";
import {
  fromTaipeiDateTimeLocal,
  getEventDateLabel,
  getEventTimeRange,
} from "@/lib/format-event-date";
import type { Locale } from "@/lib/locale";
import { compileTicketPlan, type TicketPlan } from "@/lib/ticket-plan";
import { cn, isRenderableImageSrc } from "@/lib/utils";
import type { UseCreateEventReturn } from "@/hooks/use-create-event";
import { bankInfoTitle, type SavedBankInfo, type SavedOrganizer } from "@/hooks/use-saved-info";

export type CreateStepProps = { form: UseCreateEventReturn };

// ============ 共用的呈現 ============

/** 預覽與步驟列用的短日期：單晚或同一天帶時間，跨天只列日期 */
export function shortWhen(startAt: string, endAt: string, locale: Locale): string {
  const span = rangeSpan(startAt, endAt);
  const start = fromTaipeiDateTimeLocal(startAt);
  const end = fromTaipeiDateTimeLocal(endAt);
  if (!span || !start || !end) return "";
  if (span.overnight || span.days === 1) {
    return `${getEventDateLabel(start, start, locale)} ${getEventTimeRange(start, end)}`;
  }
  return getEventDateLabel(start, end, locale);
}

/** 「https://instagram.com/zoukatom.tw」→「@zoukatom.tw」；不是網址就原樣顯示 */
function instagramHandle(value: string): string {
  try {
    const seg = new URL(value).pathname.split("/").filter(Boolean)[0];
    return seg ? `@${seg}` : value;
  } catch {
    return value;
  }
}

/** 售票方案的摘要：每個區塊一列（票名、最低價），以及全部票的最低價 */
export function planTicketSummary(plan: TicketPlan) {
  const { groups, items } = compileTicketPlan(plan);
  const pricesOf = (item: (typeof items)[number]) => {
    const onSale = item.prices.filter((p) => p.available).map((p) => p.amount);
    return onSale.length > 0 ? onSale : [item.amount];
  };
  const all = items.flatMap(pricesOf);
  const rows = groups
    .map((g) => {
      const groupItems = items.filter((i) => i.groupKey === g.key);
      const prices = groupItems.flatMap(pricesOf);
      return {
        key: g.key,
        title: g.title,
        names: groupItems.map((i) => i.name).join("、"),
        min: prices.length > 0 ? Math.min(...prices) : 0,
        varies: new Set(prices).size > 1,
      };
    })
    .filter((r) => r.names !== "");
  return { count: items.length, min: all.length > 0 ? Math.min(...all) : 0, rows };
}

/** 每一步填好之後的答案（步驟列、完成頁共用） */
export function useStepAnswers(form: UseCreateEventReturn): Record<CreateStep, string> {
  const t = useTranslations("createEvent");
  const locale = useLocale() as Locale;
  const location = form.locations.data?.find((l) => l.id === form.locationId);
  const organizer = form.organizers.data?.find((o) => o.id === form.organizerId);
  const bank = form.bankInfos.data?.find((b) => b.id === form.bankInfoId);
  const tickets = form.ticketPlan ? planTicketSummary(form.ticketPlan) : null;
  const withLine = form.linePay && form.linePayeeId != null;
  return {
    type: form.type ? t(`type.options.${form.type}.title`) : "",
    title: form.title.trim(),
    dates: shortWhen(form.startAt, form.endAt, locale),
    location: location?.name ?? "",
    cover: t("answers.cover"),
    description: t("answers.description"),
    organizer: organizer?.name ?? "",
    payment: bank
      ? withLine
        ? t("answers.withLinePay", { bank: bankInfoTitle(bank) })
        : bankInfoTitle(bank)
      : "",
    tickets: tickets ? t("answers.tickets", { count: tickets.count, price: money(tickets.min) }) : "",
    review: "",
  };
}

/** 回到一個先前跳過、還沒補的步驟時，提醒它發布前要補 */
function SkippedNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-butter-soft px-4 py-3 text-sm text-butter-ink">{children}</p>
  );
}

/**
 * 「＋ 新增…」：選了才展開表單（沿用常用資訊頁的新增表單），存好就自動選起來。
 * 團隊還沒有任何一筆時一進來就展開；按取消一定收得起來（所以開關狀態是三態，null = 還沒動過）。
 */
function AddNewCard({
  open,
  onOpen,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpen: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <OptionCard
      kind="radio"
      selected={open}
      onClick={onOpen}
      title={title}
      description={description}
      leading={
        <Plus className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
      }
    >
      <div className="rounded-xl bg-white p-4 ring-1 ring-inset ring-hairline">{children}</div>
    </OptionCard>
  );
}

function wasSkipped(form: UseCreateEventReturn, step: CreateStep) {
  return CREATE_STEPS.indexOf(step) < form.furthest && !form.filled[step];
}

// ============ 1 類型 ============

export function TypeStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent");
  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("type.title")} description={t("type.description")} />
      <div role="radiogroup" aria-label={t("steps.type")} className="grid gap-3 sm:grid-cols-3">
        {EVENT_TYPES.map(({ value }) => (
          <OptionCard
            key={value}
            kind="radio"
            selected={form.type === value}
            onClick={() => form.setType(value)}
            title={t(`type.options.${value}.title`)}
            description={t(`type.options.${value}.description`)}
          />
        ))}
      </div>
      {form.showRequired && !form.filled.type && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {t("type.required")}
        </p>
      )}
    </div>
  );
}

// ============ 2 名稱 ============

export function TitleStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.title");
  const ideaType = form.type ?? "Workshop";
  const ideas = [t(`ideas.${ideaType}.a`), t(`ideas.${ideaType}.b`)];
  const showError = form.showRequired && !form.filled.title;
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-event-title" className="text-sm font-semibold text-ink">
          {t("label")}
        </label>
        <Input
          id="create-event-title"
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder={t("placeholder")}
          aria-invalid={showError || undefined}
          aria-describedby="create-event-title-count"
          className="h-13 text-lg font-semibold md:text-xl"
        />
        <div className="flex items-start justify-between gap-3">
          {showError ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {t("required")}
            </p>
          ) : (
            <span />
          )}
          <span id="create-event-title-count" className="shrink-0 text-xs text-muted-ink tabular-nums">
            {t("count", { count: form.title.length, max: TITLE_MAX_LENGTH })}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted-ink">{t("ideasLabel")}</span>
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => form.setTitle(idea)}
            className="min-h-9 rounded-full bg-field px-3 text-[13px] font-medium text-ink hover:bg-hairline cursor-pointer"
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ 3 日期 ============

export function DatesStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.dates");
  const locale = useLocale();
  const span = rangeSpan(form.startAt, form.endAt);
  const label = (value: string) => dayDateLabels(value.slice(0, 10), 1, locale)[0] ?? "";
  const startDate = form.startAt.slice(0, 10);
  const startTime = form.startAt.slice(11, 16);
  const endDate = form.endAt.slice(0, 10);
  const endTime = form.endAt.slice(11, 16);
  // 日期或時間其中一格清空時，另一格還要留著
  const join = (date: string, time: string) => (date && time ? `${date}T${time}` : "");

  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      <div role="group" aria-label={t("presetsLabel")} className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((p) => {
          const active = form.preset === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => form.pickPreset(p)}
              className={cn(
                "min-h-11 rounded-lg px-3.5 text-sm font-semibold transition-colors cursor-pointer",
                active
                  ? "bg-brand-soft text-brand-strong ring-2 ring-inset ring-brand"
                  : "bg-white text-ink ring-1 ring-inset ring-card-border hover:bg-paper"
              )}
            >
              {t(`presets.${p}`)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        <fieldset className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-ink">{t("start")}</legend>
          <div className="flex gap-2">
            <Input
              type="date"
              aria-label={t("startDate")}
              value={startDate}
              onChange={(e) => form.setStartAt(join(e.target.value, startTime))}
              className="h-11 min-w-0 flex-1"
            />
            <Input
              type="time"
              aria-label={t("startTime")}
              value={startTime}
              onChange={(e) => form.setStartAt(join(startDate, e.target.value))}
              className="h-11 w-32 shrink-0"
            />
          </div>
        </fieldset>
        <fieldset className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-ink">{t("end")}</legend>
          <div className="flex gap-2">
            <Input
              type="date"
              aria-label={t("endDate")}
              value={endDate}
              onChange={(e) => form.setEndAt(join(e.target.value, endTime))}
              className="h-11 min-w-0 flex-1"
            />
            <Input
              type="time"
              aria-label={t("endTime")}
              value={endTime}
              onChange={(e) => form.setEndAt(join(endDate, e.target.value))}
              className="h-11 w-32 shrink-0"
            />
          </div>
        </fieldset>
      </div>
      {span ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-brand-soft px-4 py-3.5">
          <CalendarDays className="size-[18px] shrink-0 text-brand-strong" aria-hidden />
          <span className="font-semibold text-ink">
            {t("summary", {
              start: label(form.startAt),
              startTime,
              end: label(form.endAt),
              endTime,
              span: span.overnight ? t("overnight") : t("days", { count: span.days }),
            })}
          </span>
        </div>
      ) : (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700">
          {t("invalid")}
        </p>
      )}
      <p className="text-[13px] text-muted-ink">{t("hint")}</p>
    </div>
  );
}

// ============ 4 地點 ============

export function LocationStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.location");
  const list = form.locations.data ?? [];
  const [adding, setAdding] = useState<boolean | null>(null);
  const open = adding ?? (form.locations.isSuccess && list.length === 0);
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      <div role="radiogroup" aria-label={t("title")} className="flex flex-col gap-2.5">
        {list.map((loc) => (
          <OptionCard
            key={loc.id}
            kind="radio"
            selected={!open && form.locationId === loc.id}
            onClick={() => {
              setAdding(false);
              form.setLocationId(loc.id);
            }}
            title={loc.name}
            description={loc.address || t("noAddress")}
          />
        ))}
        <AddNewCard
          open={open}
          onOpen={() => {
            setAdding(true);
            form.setLocationId(null);
          }}
          title={t("add")}
          description={t("addDescription")}
        >
          <LocationDrawer
            teamId={form.teamId}
            onSuccess={async (id) => {
              await form.locations.refetch();
              form.setLocationId(id);
            }}
            onCancel={() => setAdding(false)}
          />
          <p className="mt-3 text-[13px] text-muted-ink">{t("savedHint")}</p>
        </AddNewCard>
      </div>
      {wasSkipped(form, "location") && !open && <SkippedNotice>{t("skipped")}</SkippedNotice>}
    </div>
  );
}

// ============ 5 封面 ============

export function CoverStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.cover");
  const [dragging, setDragging] = useState(false);
  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) form.pickCover(file);
  };
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      {form.coverPreview ? (
        <div className="flex flex-col gap-3">
          <div className="aspect-video max-h-80 overflow-hidden rounded-2xl bg-field">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview of a file that isn't uploaded yet */}
            <img src={form.coverPreview} alt={t("alt")} className="size-full object-cover" />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-card-border bg-white px-3.5 text-sm font-semibold text-ink hover:border-ink">
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
              <ImageUp className="size-4" aria-hidden />
              <span>{t("change")}</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={form.removeCover}
              className="h-11 px-3.5 text-sm font-semibold text-red-700 hover:bg-red-50 hover:text-red-700"
            >
              {t("remove")}
            </Button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex aspect-video max-h-80 w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed text-center transition-colors focus-within:ring-2 focus-within:ring-brand-strong",
            dragging ? "border-brand-strong bg-brand-soft" : "border-gray-300 bg-paper hover:border-brand-strong"
          )}
        >
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
          <ImageUp className="size-8 text-brand-strong" aria-hidden />
          <span className="text-base font-bold text-ink">{t("choose")}</span>
          <span className="px-4 text-[13px] text-muted-ink">{t("hint")}</span>
        </label>
      )}
      {form.coverError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {form.coverError}
        </p>
      )}
    </div>
  );
}

// ============ 6 介紹 ============

const SNIPPETS = ["schedule", "teachers", "notices", "transport"] as const;

export function DescriptionStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.description");
  const append = (text: string) => {
    const current = form.description.trimEnd();
    form.setDescription(current ? `${current}\n\n${text}` : text);
  };
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      <div role="group" aria-label={t("snippetsLabel")} className="flex flex-wrap gap-2">
        {SNIPPETS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => append(t(`snippets.${key}.text`))}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-gray-400 bg-white px-3 text-[13px] font-semibold text-brand-strong hover:bg-paper cursor-pointer"
          >
            <Plus className="size-3.5" aria-hidden />
            <span>{t(`snippets.${key}.label`)}</span>
          </button>
        ))}
      </div>
      <DescriptionEditor value={form.description} onChange={form.setDescription} />
    </div>
  );
}

// ============ 7 主辦 ============

function OrganizerAvatar({ organizer, selected }: { organizer: SavedOrganizer; selected: boolean }) {
  if (isRenderableImageSrc(organizer.photoUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small avatar; organizer photos may come from any host
      <img src={organizer.photoUrl} alt="" className="size-10 shrink-0 rounded-full bg-field object-cover" />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-bold",
        selected ? "bg-brand-strong text-white" : "bg-field text-brand-strong"
      )}
    >
      {organizer.name.charAt(0)}
    </span>
  );
}

export function OrganizerStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.organizer");
  const list = form.organizers.data ?? [];
  const [adding, setAdding] = useState<boolean | null>(null);
  const open = adding ?? (form.organizers.isSuccess && list.length === 0);
  const socials = (o: SavedOrganizer) =>
    o.instagram ? `IG ${instagramHandle(o.instagram)}` : o.facebook ? "Facebook" : t("noSocials");
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("title")} description={t("description")} />
      <div role="radiogroup" aria-label={t("title")} className="flex flex-col gap-2.5">
        {list.map((o) => {
          const selected = !open && form.organizerId === o.id;
          return (
            <OptionCard
              key={o.id}
              kind="radio"
              selected={selected}
              onClick={() => {
                setAdding(false);
                form.setOrganizerId(o.id);
              }}
              title={o.name}
              description={socials(o)}
              leading={<OrganizerAvatar organizer={o} selected={selected} />}
            />
          );
        })}
        <AddNewCard
          open={open}
          onOpen={() => {
            setAdding(true);
            form.setOrganizerId(null);
          }}
          title={t("add")}
          description={t("addDescription")}
        >
          <OrganizerDrawer
            teamId={form.teamId}
            onSuccess={async (id) => {
              await form.organizers.refetch();
              form.setOrganizerId(id);
            }}
            onCancel={() => setAdding(false)}
          />
        </AddNewCard>
      </div>
    </div>
  );
}

// ============ 8 收款 ============

export function PaymentStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent.payment");
  const tBank = useTranslations("savedInfo.bank");
  const banks = form.bankInfos.data ?? [];
  const payees = form.linePayees.data ?? [];
  const [addingBank, setAddingBank] = useState<boolean | null>(null);
  const [addingPayee, setAddingPayee] = useState<boolean | null>(null);
  const bankOpen = addingBank ?? (form.bankInfos.isSuccess && banks.length === 0);
  const payeeOpen = addingPayee ?? (form.linePayees.isSuccess && payees.length === 0);
  const bankDescription = (b: SavedBankInfo) =>
    [
      b.label ? `${b.bankName} ${b.bankCode}` : null,
      b.account ? tBank("selectAccount", { account: b.account }) : tBank("selectNoAccount"),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <StepIntro title={t("title")} description={t("description")} />

      <div className="flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-ink">{t("bankQuestion")}</h3>
        <div role="radiogroup" aria-label={t("bankQuestion")} className="flex flex-col gap-2.5">
          {banks.map((b) => (
            <OptionCard
              key={b.id}
              kind="radio"
              selected={!bankOpen && form.bankInfoId === b.id}
              onClick={() => {
                setAddingBank(false);
                form.setBankInfoId(b.id);
              }}
              title={bankInfoTitle(b)}
              description={bankDescription(b)}
            />
          ))}
          <AddNewCard
            open={bankOpen}
            onOpen={() => {
              setAddingBank(true);
              form.setBankInfoId(null);
            }}
            title={t("addBank")}
            description={t("addBankDescription")}
          >
            <BankInfoDrawer
              teamId={form.teamId}
              onSuccess={async (id) => {
                await form.bankInfos.refetch();
                form.setBankInfoId(id);
              }}
              onCancel={() => setAddingBank(false)}
            />
          </AddNewCard>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-hairline pt-5">
        <h3 className="text-sm font-semibold text-ink">{t("lineQuestion")}</h3>
        <ChoicePair
          size="md"
          value={form.linePay}
          onChange={form.setLinePay}
          yesLabel={t("lineYes")}
          noLabel={t("lineNo")}
          ariaLabel={t("lineQuestion")}
        />
        {form.linePay && (
          <div className="mt-2 flex flex-col gap-2.5">
            <h4 className="text-[13px] font-semibold text-ink">{t("linePayeeQuestion")}</h4>
            <div role="radiogroup" aria-label={t("linePayeeQuestion")} className="flex flex-col gap-2.5">
              {payees.map((p) => (
                <OptionCard
                  key={p.id}
                  kind="radio"
                  selected={!payeeOpen && form.linePayeeId === p.id}
                  onClick={() => {
                    setAddingPayee(false);
                    form.setLinePayeeId(p.id);
                  }}
                  title={p.label}
                  description={p.lineId}
                />
              ))}
              <AddNewCard
                open={payeeOpen}
                onOpen={() => {
                  setAddingPayee(true);
                  form.setLinePayeeId(null);
                }}
                title={t("addLinePayee")}
                description={t("addLinePayeeDescription")}
              >
                <LinePayeeDrawer
                  teamId={form.teamId}
                  onSuccess={async (id) => {
                    await form.linePayees.refetch();
                    form.setLinePayeeId(id);
                  }}
                  onCancel={() => setAddingPayee(false)}
                />
              </AddNewCard>
            </div>
          </div>
        )}
      </div>

      {wasSkipped(form, "payment") && !bankOpen && <SkippedNotice>{t("skipped")}</SkippedNotice>}
    </div>
  );
}

// ============ 9 票券 ============

export function TicketsStep({
  form,
  onOpenWizard,
}: CreateStepProps & { onOpenWizard: (edit: boolean) => void }) {
  const t = useTranslations("createEvent");
  const summary = form.ticketPlan ? planTicketSummary(form.ticketPlan) : null;
  return (
    <div className="flex flex-col gap-5">
      <StepIntro title={t("tickets.title")} description={t("tickets.description")} />
      {summary ? (
        <>
          <div className="rounded-2xl ring-1 ring-inset ring-card-border">
            <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                <Ticket className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 font-bold text-ink">
                {t("tickets.doneTitle", { count: summary.count })}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenWizard(true)}
                className="h-10 px-3 text-sm font-semibold text-brand-strong"
              >
                {t("tickets.edit")}
              </Button>
            </div>
            <div className="flex flex-col divide-y divide-hairline px-4 py-1.5">
              {summary.rows.map((row) => (
                <div key={row.key} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold text-ink">{row.title}</span>
                    {row.names !== row.title && (
                      <span className="truncate text-[13px] text-muted-ink">{row.names}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">
                    {row.varies ? t("tickets.from", { price: money(row.min) }) : money(row.min)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[13px] text-muted-ink">{t("tickets.editLater")}</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-brand-soft px-5 py-5">
            <Ticket className="size-7 shrink-0 text-brand-strong" aria-hidden />
            <div className="min-w-0 flex-1 basis-60">
              <p className="font-bold text-ink">{t("tickets.emptyTitle")}</p>
              <p className="mt-0.5 text-sm text-gray-700">
                {t("tickets.emptyDescription", {
                  type: form.type ? t(`type.options.${form.type}.title`) : "",
                })}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => onOpenWizard(false)}
              className="h-12 bg-ink px-5 font-bold text-white hover:bg-ink/90"
            >
              {t("tickets.start")}
            </Button>
          </div>
          {wasSkipped(form, "tickets") && <SkippedNotice>{t("tickets.skipped")}</SkippedNotice>}
        </>
      )}
    </div>
  );
}

// ============ 10 完成 ============

export function ReviewStep({ form }: CreateStepProps) {
  const t = useTranslations("createEvent");
  const answers = useStepAnswers(form);
  const missing = form.missing;
  const optional = (["cover", "description", "organizer"] as const).filter((s) => !form.filled[s]);
  const done = CREATE_STEPS.filter((s) => s !== "review" && form.filled[s]);
  const ready = missing.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={ready ? t("review.readyTitle") : t("review.missingTitle")}
        description={ready ? t("review.readyDescription") : t("review.missingDescription")}
      />

      {!ready && (
        <section className="rounded-2xl bg-butter-soft pb-2" aria-labelledby="review-missing">
          <h3 id="review-missing" className="px-4 pb-1.5 pt-3.5 text-sm font-bold text-butter-ink">
            {t("review.missingHeading")}
          </h3>
          {missing.map((s) => (
            <div key={s} className="flex items-center gap-2.5 py-1.5 pl-4 pr-2.5">
              <span aria-hidden className="size-[18px] shrink-0 rounded-full border-2 border-dashed border-butter-ink" />
              <span className="min-w-0 flex-1 font-semibold text-ink">{t(`steps.${s}`)}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.goTo(s)}
                className="h-10 bg-white px-3.5 text-sm font-semibold text-ink hover:bg-white/80"
              >
                {t("review.fill")}
              </Button>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl pb-2 ring-1 ring-inset ring-card-border" aria-labelledby="review-done">
        <h3 id="review-done" className="px-4 pb-1.5 pt-3.5 text-sm font-bold text-ink">
          {t("review.doneHeading")}
        </h3>
        {done.map((s) => (
          <div key={s} className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand">
              <Check className="size-3 text-ink" strokeWidth={3.5} />
            </span>
            <span className="w-24 shrink-0 text-muted-ink">{t(`steps.${s}`)}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{answers[s]}</span>
          </div>
        ))}
      </section>

      {optional.length > 0 && (
        <section className="rounded-2xl pb-2 ring-1 ring-inset ring-hairline" aria-labelledby="review-optional">
          <h3 id="review-optional" className="px-4 pb-1.5 pt-3.5 text-sm font-bold text-ink">
            {t("review.optionalHeading")}
          </h3>
          {optional.map((s) => (
            <div key={s} className="flex items-center gap-2.5 py-1 pl-4 pr-2.5 text-sm">
              <span aria-hidden className="size-[18px] shrink-0 rounded-full border-2 border-dashed border-gray-400" />
              <span className="min-w-0 flex-1 text-ink">{t(`steps.${s}`)}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.goTo(s)}
                className="h-10 px-3 text-sm font-semibold text-brand-strong"
              >
                {t("review.fill")}
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
