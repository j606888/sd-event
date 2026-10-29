import { nanoid } from "nanoid";
import {
  compileTicketPlan,
  createDefaultTicketPlan,
  type CompiledItem,
  type PlanEventKind,
  type PlanStep,
  type TicketPlan,
} from "@/lib/ticket-plan";
import type { EventType } from "@/lib/event-templates";

/** 精靈裡新增的時段／課程／Party 用的 key（伺服器靠它對回同一筆資料） */
export const newPlanKey = () => nanoid(10);

export const PLAN_KIND_BY_EVENT_TYPE: Record<EventType, PlanEventKind> = {
  Workshop: "workshop",
  Party: "party",
  Festival: "festival",
};

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD"（台北日期）往後 n 天 */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00+08:00`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** 台北「今天」的 "YYYY-MM-DD" */
function taipeiToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

/** 每一天的顯示日期：zh「12/12（六）」、en「Sat 12/12」 */
export function dayDateLabels(startDate: string, count: number, locale: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return [];
  const isZh = locale.startsWith("zh");
  const weekday = new Intl.DateTimeFormat(isZh ? "zh-TW" : "en-US", {
    weekday: isZh ? "narrow" : "short",
    timeZone: "Asia/Taipei",
  });
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(startDate, i);
    const [, m, d] = date.split("-").map(Number);
    const w = weekday.format(new Date(`${date}T12:00:00+08:00`));
    return isZh ? `${m}/${d}（${w}）` : `${w} ${m}/${d}`;
  });
}

/** 活動起訖（datetime-local，台北時間）涵蓋幾個日曆天 */
function spanDays(startAt: string, endAt: string): number {
  const s = startAt.slice(0, 10);
  const e = endAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return 1;
  const days = Math.round((Date.parse(e) - Date.parse(s)) / DAY_MS) + 1;
  return Math.max(1, Math.min(4, days));
}

/**
 * 前兩段的預設截止日：開跑前 4 週、前 1 週；活動日期還沒填或已經來不及，
 * 就從今天往後 2 週、4 週（跟活動範本一樣，主辦人再自己調）。
 */
function defaultTierEnds(startAt: string): [string, string] {
  const today = taipeiToday();
  const start = startAt.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const a = addDays(start, -28);
    const b = addDays(start, -7);
    if (a > today) return [a, b];
  }
  return [addDays(today, 14), addDays(today, 28)];
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** 新的答案：依活動類型與日期帶入預設值，存進活動的文字依目前介面語系產生 */
export function buildDefaultPlan(opts: {
  eventType: EventType;
  startAt: string;
  endAt: string;
  locale: string;
  t: Translate;
  tTemplates: Translate;
}): TicketPlan {
  const { eventType, startAt, endAt, locale, t, tTemplates } = opts;
  const kind = PLAN_KIND_BY_EVENT_TYPE[eventType] ?? "workshop";
  const days = kind === "party" ? 1 : spanDays(startAt, endAt);
  return createDefaultTicketPlan({
    kind,
    dayDates: dayDateLabels(startAt.slice(0, 10), days, locale),
    tierEnds: defaultTierEnds(startAt),
    labels: {
      groupTitles: {
        full: t("labels.groupFull"),
        day: t("labels.groupDay"),
        classes: t("labels.groupClasses"),
        parties: t("labels.groupParties"),
        entry: t("labels.groupEntry"),
      },
      tierNames: {
        superEarly: tTemplates("superEarlyBird"),
        early: tTemplates("earlyBird"),
        door: tTemplates("regularOrDoor"),
      },
      fullPass: t("labels.fullPass"),
      dayPass: (n) => t("labels.dayPass", { n }),
      partyEntry: t("labels.partyEntry"),
      pairName: (name) => t("labels.pairName", { name }),
      bundleNote: t("labels.bundleNote"),
      earlyName: t("labels.earlyName"),
    },
    newKey: newPlanKey,
  });
}

// ============ 確認頁／後台共用的呈現 ============

export type BlockId = "full" | "day" | "single" | "entry";

export type PlanBlock = {
  id: BlockId;
  /** 「修改」回到精靈的哪一步 */
  step: PlanStep;
  /** 分階段的票（表格，一段一欄） */
  rows: CompiledItem[];
  /** 單獨購買區塊：單堂課／Party 兩組 */
  groups: { id: "classes" | "parties"; items: CompiledItem[] }[];
};

/** 照「買法」把票分區塊：Full Pass／Day Pass／單獨購買（純 Party 只有入場票） */
export function planBlocks(plan: TicketPlan): PlanBlock[] {
  const { items } = compileTicketPlan(plan);
  const of = (key: CompiledItem["groupKey"]) => items.filter((i) => i.groupKey === key);
  const blocks: PlanBlock[] = [];
  if (plan.kind === "party") {
    blocks.push({ id: "entry", step: "party", rows: of("entry"), groups: [] });
    return blocks;
  }
  if (of("full").length) blocks.push({ id: "full", step: "full", rows: of("full"), groups: [] });
  if (of("day").length) blocks.push({ id: "day", step: "day", rows: of("day"), groups: [] });
  const classes = of("classes");
  const parties = of("parties");
  if (classes.length || parties.length) {
    blocks.push({
      id: "single",
      step: classes.length ? "classes" : "party",
      rows: [],
      groups: [
        ...(classes.length ? [{ id: "classes" as const, items: classes }] : []),
        ...(parties.length ? [{ id: "parties" as const, items: parties }] : []),
      ],
    });
  }
  return blocks;
}

export type PlanPath = {
  id: "full" | "mix";
  chips: { label: "full" | "day" | "classes" | "parties"; tone: "dark" | "soft" | "plain" }[];
  desc: "buyFullDesc" | "buyFullPartyDesc" | "mixDayDesc" | "mixDayOnly" | "mixFreeDesc";
};

/** 「報名者怎麼買」：買 Full Pass，或不買 Full Pass 自己搭（取代逐條規則） */
export function planPaths(plan: TicketPlan): PlanPath[] {
  if (plan.kind === "party") return [];
  const blocks = compileTicketPlan(plan).groups.map((g) => g.key);
  const full = blocks.includes("full");
  const day = blocks.includes("day");
  const classes = blocks.includes("classes");
  const parties = blocks.includes("parties");
  const paths: PlanPath[] = [];
  if (full) {
    const partyAddOn = parties && !plan.full.includesParty;
    paths.push({
      id: "full",
      chips: [
        { label: "full", tone: "dark" },
        ...(partyAddOn ? [{ label: "parties" as const, tone: "plain" as const }] : []),
      ],
      desc: partyAddOn ? "buyFullPartyDesc" : "buyFullDesc",
    });
  }
  const others: PlanPath["chips"] = [
    ...(day ? [{ label: "day" as const, tone: "soft" as const }] : []),
    ...(classes ? [{ label: "classes" as const, tone: "plain" as const }] : []),
    ...(parties ? [{ label: "parties" as const, tone: "plain" as const }] : []),
  ];
  if (others.length) {
    paths.push({
      id: "mix",
      chips: others,
      desc: day ? (classes || parties ? "mixDayDesc" : "mixDayOnly") : "mixFreeDesc",
    });
  }
  return paths;
}

export type PlanProblem = {
  key: "noTickets" | "blankNames" | "tierDates" | "couponCode";
  step: PlanStep;
};

/** 送出前要擋下來的問題（伺服器的 parseTicketPlan 會擋同樣的東西，這裡先講清楚是哪一步） */
export function planProblems(plan: TicketPlan): PlanProblem[] {
  const problems: PlanProblem[] = [];
  const compiled = compileTicketPlan(plan);
  if (compiled.items.length === 0) problems.push({ key: "noTickets", step: "type" });
  const blank = compiled.items.find((i) => !i.name.trim() || /·\s*$/.test(i.name));
  if (blank) {
    const step: PlanStep =
      blank.groupKey === "classes"
        ? "classes"
        : blank.groupKey === "parties" || blank.groupKey === "entry"
          ? "party"
          : blank.groupKey === "day"
            ? "day"
            : "full";
    problems.push({ key: "blankNames", step });
  }
  if (plan.tiered) {
    const ends = plan.tiers.slice(0, -1).map((t) => t.endsAt);
    const ok = ends.every((e, i) => /^\d{4}-\d{2}-\d{2}$/.test(e) && (i === 0 || e > ends[i - 1]));
    if (!ok) problems.push({ key: "tierDates", step: "tiers" });
  }
  if (plan.coupon.enabled && !/^[A-Za-z0-9_-]{1,32}$/.test(plan.coupon.code.trim())) {
    problems.push({ key: "couponCode", step: "special" });
  }
  return problems;
}

/** 現在落在哪一段（第一個還沒截止的；都截止了就是最後一段） */
export function currentTierIndex(plan: TicketPlan, now = new Date()): number {
  if (!plan.tiered) return 0;
  const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  const idx = plan.tiers.findIndex((t, i) => i === plan.tiers.length - 1 || t.endsAt >= today);
  return idx === -1 ? plan.tiers.length - 1 : idx;
}

/** 某段的期間文字所需的日期（前一段截止的隔天 → 這段截止） */
export function tierRange(plan: TicketPlan, index: number): { from: string | null; to: string | null } {
  const to = index < plan.tiers.length - 1 ? plan.tiers[index].endsAt || null : null;
  const prevEnd = index > 0 ? plan.tiers[index - 1].endsAt : "";
  const from = prevEnd ? addDays(prevEnd, 1) : null;
  return { from, to };
}

/** "YYYY-MM-DD" → "11/8" */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return m && d ? `${m}/${d}` : date;
}
