/**
 * 售票精靈（一問一答建立票券）的資料模型；前後端共用、純函式。
 *
 * 精靈的答案存成 TicketPlan（events.ticket_plan），再由 compileTicketPlan() 轉成既有的
 * 票價時段／票種區塊／購買項目／區塊互斥／折扣碼 —— 報名、計價、驗證全部沿用原本的模型，
 * 精靈只是「比較好懂的設定方式」。
 *
 * 轉換規則（Workshop / Festival）：
 *   區塊「Full Pass」擇一 ← Full Pass、雙人 Full Pass、1+1 早鳥票
 *   區塊「Day Pass」  擇一 ← 每天一張
 *   區塊「單堂課」    可複選
 *   區塊「Party」     可複選
 *   互斥：Full Pass ↔ Day Pass、單堂課；Full Pass 含 Party 時再加 ↔ Party
 * 只有一個區塊時設為必選；多個區塊時都選填（報名 API 本來就要求至少選一張票）。
 */

export const TICKET_PLAN_VERSION = 1;

export type PlanEventKind = "workshop" | "party" | "festival";

/** 票價階段；endsAt 為 "YYYY-MM-DD"（台北當日結束），最後一段為 "" = 不截止 */
export type PlanTier = { key: string; name: string; endsAt: string };

/**
 * 一張票。prices 對齊 tiers（分階段時）；不分階段時只有一個價格。
 * note 存進購買項目的說明（報名表顯示在票名下方），例如日期或時間。
 */
export type PlanTicket = {
  key: string;
  name: string;
  note: string;
  prices: number[];
  /** 單堂課在第幾天（多天活動時票名前面會加「Day n · 」） */
  day?: number;
};

export type TicketPlan = {
  version: typeof TICKET_PLAN_VERSION;
  kind: PlanEventKind;
  /** 課程天數（純 Party 不用） */
  days: number;
  /** false = 整個報名期間同一個價格（tiers 為空） */
  tiered: boolean;
  tiers: PlanTier[];
  /** 區塊標題；建立當下依介面語系產生後存起來（跟範本名稱一樣） */
  groupTitles: { full: string; day: string; classes: string; parties: string; entry: string };
  full: { enabled: boolean; includesParty: boolean; ticket: PlanTicket };
  day: { enabled: boolean; samePrice: boolean; tickets: PlanTicket[] };
  /** tiered = 單堂課也跟著階段調價（否則 prices 只有一個） */
  classes: { enabled: boolean; tiered: boolean; tickets: PlanTicket[] };
  parties: { enabled: boolean; tiered: boolean; tickets: PlanTicket[] };
  /** 純 Party 的入場票（第一張是主要入場票，其餘是「再加一種票」） */
  entry: { tickets: PlanTicket[] };
  /** 雙人票：套用在 Full Pass（純 Party 時套用在主要入場票），一組 2 人 */
  pair: { enabled: boolean; rate: number; ticket: PlanTicket };
  /** 早鳥限定票（如 1+1）：一組 2 人，只在 tierIndex 那一段販售，之後顯示已截止 */
  early: { enabled: boolean; tierIndex: number; ticket: PlanTicket };
  /** 折扣碼；rate 為折數（9 = 九折） */
  coupon: { enabled: boolean; code: string; rate: number; usageLimit: number | null };
  /** plan key → 資料庫 id；只由伺服器寫入 */
  ids?: TicketPlanIds;
};

export type TicketPlanIds = {
  tiers: Record<string, number>;
  groups: Record<string, number>;
  items: Record<string, number>;
  coupon?: number;
};

/** 精靈的步驟（順序即顯示順序）；純 Party 沒有 full / day / classes */
export const PLAN_STEPS = [
  "type",
  "tiers",
  "full",
  "day",
  "classes",
  "party",
  "special",
  "review",
] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

export function planSteps(kind: PlanEventKind): PlanStep[] {
  return kind === "party"
    ? ["type", "tiers", "party", "special", "review"]
    : [...PLAN_STEPS];
}

// ============ 預設答案 ============

/** 預設答案裡會存進活動的文字；由呼叫端依介面語系提供（跟範本名稱一樣） */
export type PlanLabels = {
  groupTitles: TicketPlan["groupTitles"];
  tierNames: { superEarly: string; early: string; door: string };
  fullPass: string;
  dayPass: (n: number) => string;
  partyEntry: string;
  pairName: (base: string) => string;
  bundleNote: string;
  earlyName: string;
};

/** 範例價（跟活動範本一樣，使用者會改） */
const SAMPLE = {
  full: [3000, 3500, 4000],
  day: [1800, 2000, 2200],
  entry: [400, 450, 500],
  classPrice: 800,
  partyPrice: 500,
};

/**
 * 建立一份新的答案。dayDates 是每一天的顯示日期（決定 Day Pass 數量與說明），
 * tierEnds 是前兩段（Super Early Bird／Early Bird）的截止日 "YYYY-MM-DD"。
 */
export function createDefaultTicketPlan(opts: {
  kind: PlanEventKind;
  dayDates: string[];
  tierEnds: [string, string];
  labels: PlanLabels;
  newKey: () => string;
}): TicketPlan {
  const { kind, dayDates, tierEnds, labels, newKey } = opts;
  const tiers: PlanTier[] = [
    { key: newKey(), name: labels.tierNames.superEarly, endsAt: tierEnds[0] },
    { key: newKey(), name: labels.tierNames.early, endsAt: tierEnds[1] },
    { key: newKey(), name: labels.tierNames.door, endsAt: "" },
  ];
  const plan: TicketPlan = {
    version: TICKET_PLAN_VERSION,
    kind,
    days: Math.max(1, Math.min(7, dayDates.length || 1)),
    tiered: true,
    tiers,
    groupTitles: labels.groupTitles,
    full: {
      enabled: kind !== "party",
      includesParty: true,
      ticket: { key: "full", name: labels.fullPass, note: "", prices: SAMPLE.full },
    },
    day: {
      enabled: kind === "festival",
      samePrice: true,
      tickets: [],
    },
    classes: { enabled: false, tiered: false, tickets: [] },
    parties: { enabled: false, tiered: false, tickets: [] },
    entry: {
      tickets: [{ key: "entry", name: labels.partyEntry, note: "", prices: SAMPLE.entry }],
    },
    pair: {
      enabled: false,
      rate: 9,
      ticket: {
        key: "pair",
        name: labels.pairName(kind === "party" ? labels.partyEntry : labels.fullPass),
        note: labels.bundleNote,
        prices: (kind === "party" ? SAMPLE.entry : SAMPLE.full).map((p) => pairPrice(p, 9)),
      },
    },
    early: {
      enabled: false,
      tierIndex: 0,
      ticket: {
        key: "early",
        name: labels.earlyName,
        note: labels.bundleNote,
        prices: [kind === "party" ? SAMPLE.entry[0] : SAMPLE.full[0]],
      },
    },
    coupon: { enabled: false, code: "", rate: 9, usageLimit: null },
  };
  return syncDayPasses(plan, dayDates, labels.dayPass);
}

/** Day Pass 跟著天數走：每天一張，key 固定為 day-<n>（改天數時同一天的票沿用原本那筆） */
export function syncDayPasses(
  plan: TicketPlan,
  dayDates: string[],
  dayPassName: (n: number) => string
): TicketPlan {
  const n = plan.tiered ? plan.tiers.length : 1;
  const template = plan.day.tickets[0]?.prices ?? fitPrices(SAMPLE.day, n);
  const tickets = Array.from({ length: plan.days }, (_, i) => {
    const existing = plan.day.tickets.find((t) => t.key === `day-${i + 1}`);
    return {
      key: `day-${i + 1}`,
      name: existing?.name ?? dayPassName(i + 1),
      note: dayDates[i] ?? existing?.note ?? "",
      prices: existing?.prices ?? (plan.day.samePrice ? template : fitPrices(SAMPLE.day, n)),
    };
  });
  return { ...plan, day: { ...plan.day, tickets } };
}

/** 新的一堂課／一場 Party（價格依目前是否分階段） */
export function newFlatTicket(
  plan: TicketPlan,
  group: "classes" | "parties",
  key: string,
  note = ""
): PlanTicket {
  const tiered = ticketIsTiered(plan, group);
  const n = plan.tiered ? plan.tiers.length : 1;
  const price = group === "classes" ? SAMPLE.classPrice : SAMPLE.partyPrice;
  return { key, name: "", note, prices: Array(tiered ? n : 1).fill(price) };
}

/** 所有票券的數量（精靈最後一步的按鈕、右側摘要用） */
export function countPlanTickets(plan: TicketPlan): number {
  return compileTicketPlan(plan).items.length;
}

// ============ 轉換成既有模型 ============

export type GroupKey = "full" | "day" | "classes" | "parties" | "entry";

export type CompiledTier = { key: string; name: string; endsAt: string; sortOrder: number };
export type CompiledGroup = {
  key: GroupKey;
  title: string;
  selectionMode: "single" | "multiple";
  required: boolean;
  sortOrder: number;
};
export type CompiledItem = {
  key: string;
  groupKey: GroupKey;
  name: string;
  description: string | null;
  /** fallback 價（最後一段）；沒有時段價的票就只看這個 */
  amount: number;
  seatCount: number;
  sortOrder: number;
  prices: { tierKey: string; amount: number; available: boolean }[];
  /** 每段同價（單堂課、Party、或整個活動不分階段）；畫面上只顯示一個價 */
  flat: boolean;
};
export type CompiledPlan = {
  tiers: CompiledTier[];
  groups: CompiledGroup[];
  items: CompiledItem[];
  exclusions: [GroupKey, GroupKey][];
  coupon: { code: string; percentOff: number; usageLimit: number | null } | null;
};

/**
 * 分階段的票：每段一個價。不分階段的票（單堂課、Party）在有時段的活動裡每段都寫同一個價 ——
 * 不寫的話進階模式會警告「這張票還沒有某段的價格」，雖然計價一樣（退回 fallback）但看起來像錯誤。
 */
function pricesFor(plan: TicketPlan, ticket: PlanTicket, tiered: boolean) {
  if (!plan.tiered) return { amount: ticket.prices[0] ?? 0, prices: [], flat: true };
  if (!tiered) {
    const amount = ticket.prices[0] ?? 0;
    return {
      amount,
      prices: plan.tiers.map((tier) => ({ tierKey: tier.key, amount, available: true })),
      flat: true,
    };
  }
  const last = ticket.prices[ticket.prices.length - 1] ?? 0;
  return {
    flat: false,
    amount: last,
    prices: plan.tiers.map((tier, i) => ({
      tierKey: tier.key,
      amount: ticket.prices[i] ?? last,
      available: true,
    })),
  };
}

export function compileTicketPlan(plan: TicketPlan): CompiledPlan {
  const tiers: CompiledTier[] = plan.tiered
    ? plan.tiers.map((t, i) => ({
        key: t.key,
        name: t.name,
        endsAt: i === plan.tiers.length - 1 ? "" : t.endsAt,
        sortOrder: i,
      }))
    : [];

  const groups: CompiledGroup[] = [];
  const items: CompiledItem[] = [];
  const addGroup = (key: GroupKey, selectionMode: "single" | "multiple") =>
    groups.push({
      key,
      title: plan.groupTitles[key],
      selectionMode,
      required: false,
      sortOrder: groups.length,
    });
  const addItem = (
    groupKey: GroupKey,
    ticket: PlanTicket,
    opts: { tiered: boolean; seatCount?: number }
  ) => {
    const { amount, prices, flat } = pricesFor(plan, ticket, opts.tiered);
    const name = ticket.name.trim();
    items.push({
      key: ticket.key,
      groupKey,
      name: ticket.day != null && plan.days > 1 ? `Day ${ticket.day} · ${name}` : name,
      description: ticket.note.trim() || null,
      amount,
      seatCount: opts.seatCount ?? 1,
      sortOrder: items.length,
      prices,
      flat,
    });
  };
  /** 早鳥限定票：只有 tierIndex 那段開賣，其他段標成不販售 */
  const addEarly = (groupKey: GroupKey) => {
    const price = plan.early.ticket.prices[0] ?? 0;
    items.push({
      key: plan.early.ticket.key,
      groupKey,
      name: plan.early.ticket.name.trim(),
      description: plan.early.ticket.note.trim() || null,
      amount: price,
      seatCount: 2,
      sortOrder: items.length,
      flat: false,
      prices: plan.tiers.map((tier, i) => ({
        tierKey: tier.key,
        amount: i === plan.early.tierIndex ? price : 0,
        available: i === plan.early.tierIndex,
      })),
    });
  };
  const earlyOn = plan.early.enabled && plan.tiered;

  if (plan.kind === "party") {
    addGroup("entry", "single");
    plan.entry.tickets.forEach((t) => addItem("entry", t, { tiered: true }));
    if (plan.pair.enabled) addItem("entry", plan.pair.ticket, { tiered: true, seatCount: 2 });
    if (earlyOn) addEarly("entry");
  } else {
    if (plan.full.enabled) {
      addGroup("full", "single");
      addItem("full", plan.full.ticket, { tiered: true });
      if (plan.pair.enabled) addItem("full", plan.pair.ticket, { tiered: true, seatCount: 2 });
      if (earlyOn) addEarly("full");
    }
    if (plan.day.enabled && plan.day.tickets.length > 0) {
      addGroup("day", "single");
      plan.day.tickets.forEach((t) => addItem("day", t, { tiered: true }));
    }
    if (plan.classes.enabled && plan.classes.tickets.length > 0) {
      addGroup("classes", "multiple");
      plan.classes.tickets.forEach((t) => addItem("classes", t, { tiered: plan.classes.tiered }));
    }
    if (plan.parties.enabled && plan.parties.tickets.length > 0) {
      addGroup("parties", "multiple");
      plan.parties.tickets.forEach((t) => addItem("parties", t, { tiered: plan.parties.tiered }));
    }
  }
  // 只有一個區塊時必選，報名表才會直接要求選一張
  if (groups.length === 1) groups[0].required = true;

  const has = (key: GroupKey) => groups.some((g) => g.key === key);
  const exclusions: [GroupKey, GroupKey][] = [];
  if (has("full")) {
    if (has("day")) exclusions.push(["full", "day"]);
    if (has("classes")) exclusions.push(["full", "classes"]);
    if (has("parties") && plan.full.includesParty) exclusions.push(["full", "parties"]);
  }

  const coupon = plan.coupon.enabled
    ? {
        code: plan.coupon.code.trim().toUpperCase(),
        percentOff: rateToPercentOff(plan.coupon.rate),
        usageLimit: plan.coupon.usageLimit,
      }
    : null;

  return { tiers, groups, items, exclusions, coupon };
}

/** 這張票的價格要不要對齊票價階段（否則只有一個價） */
function ticketIsTiered(plan: TicketPlan, group: "classes" | "parties" | "other"): boolean {
  if (!plan.tiered) return false;
  if (group === "classes") return plan.classes.tiered;
  if (group === "parties") return plan.parties.tiered;
  return true;
}

/** 把一個價格陣列補齊／截斷成 n 個（不足的用最後一個價補） */
function fitPrices(prices: number[], n: number): number[] {
  if (prices.length === n) return prices;
  if (prices.length > n) return prices.slice(0, n);
  const fill = prices[prices.length - 1] ?? 0;
  return [...prices, ...Array(n - prices.length).fill(fill)];
}

/**
 * 讓每張票的價格數量跟目前的票價階段對齊（改了階段數、切換分不分階段之後呼叫）。
 * 早鳥限定票永遠只有一個價；早鳥販售的階段超出範圍時退回第一段。
 */
export function alignPlanPrices(plan: TicketPlan): TicketPlan {
  const n = plan.tiered ? plan.tiers.length : 1;
  const fit = (t: PlanTicket, group: "classes" | "parties" | "other") => ({
    ...t,
    prices: fitPrices(t.prices, ticketIsTiered(plan, group) ? n : 1),
  });
  return {
    ...plan,
    full: { ...plan.full, ticket: fit(plan.full.ticket, "other") },
    day: { ...plan.day, tickets: plan.day.tickets.map((t) => fit(t, "other")) },
    classes: { ...plan.classes, tickets: plan.classes.tickets.map((t) => fit(t, "classes")) },
    parties: { ...plan.parties, tickets: plan.parties.tickets.map((t) => fit(t, "parties")) },
    entry: { tickets: plan.entry.tickets.map((t) => fit(t, "other")) },
    pair: { ...plan.pair, ticket: fit(plan.pair.ticket, "other") },
    early: {
      ...plan.early,
      tierIndex: plan.early.tierIndex <= Math.max(0, n - 2) ? plan.early.tierIndex : 0,
      ticket: { ...plan.early.ticket, prices: fitPrices(plan.early.ticket.prices, 1) },
    },
  };
}

/** 在第 index 段插入／移除一個票價階段時，同步每張分階段票券的價格欄 */
export function spliceTierPrices(
  plan: TicketPlan,
  index: number,
  op: "insert" | "remove"
): TicketPlan {
  const splice = (t: PlanTicket, tiered: boolean): PlanTicket => {
    if (!tiered) return t;
    const prices = [...t.prices];
    if (op === "insert") prices.splice(index, 0, prices[Math.min(index, prices.length - 1)] ?? 0);
    else prices.splice(index, 1);
    return { ...t, prices };
  };
  return {
    ...plan,
    full: { ...plan.full, ticket: splice(plan.full.ticket, true) },
    day: { ...plan.day, tickets: plan.day.tickets.map((t) => splice(t, true)) },
    classes: {
      ...plan.classes,
      tickets: plan.classes.tickets.map((t) => splice(t, plan.classes.tiered)),
    },
    parties: {
      ...plan.parties,
      tickets: plan.parties.tickets.map((t) => splice(t, plan.parties.tiered)),
    },
    entry: { tickets: plan.entry.tickets.map((t) => splice(t, true)) },
    pair: { ...plan.pair, ticket: splice(plan.pair.ticket, true) },
  };
}

/** 折數 → 折扣百分比（9 折 → 10、8.5 折 → 15） */
export function rateToPercentOff(rate: number): number {
  return Math.round(100 - rate * 10);
}

/** 雙人票價格：兩人份 × 折數 */
export function pairPrice(single: number, rate: number): number {
  return Math.round((single * 2 * rate) / 10);
}

// ============ 伺服器端驗證 ============

const MAX_PRICE = 1_000_000;
const MAX_NAME = 100;
const MAX_NOTE = 200;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) =>
  typeof v === "string" && v.length <= max ? v : null;
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
const KEY_RE = /^[A-Za-z0-9_-]{1,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTicket(raw: unknown, priceCount: number | null): PlanTicket | null {
  if (!isObj(raw)) return null;
  const key = typeof raw.key === "string" && KEY_RE.test(raw.key) ? raw.key : null;
  const name = str(raw.name, MAX_NAME);
  const note = str(raw.note ?? "", MAX_NOTE);
  if (!key || name == null || !name.trim() || note == null) return null;
  if (!Array.isArray(raw.prices) || raw.prices.length === 0) return null;
  const prices = raw.prices.map((p) => int(p, 0, MAX_PRICE));
  if (prices.some((p) => p == null)) return null;
  if (priceCount != null && prices.length !== priceCount) return null;
  const day = raw.day == null ? undefined : int(raw.day, 1, 7);
  if (day === null) return null;
  return { key, name, note, prices: prices as number[], ...(day != null ? { day } : {}) };
}

function parseTickets(raw: unknown, priceCount: number | null, max: number) {
  if (!Array.isArray(raw) || raw.length > max) return null;
  const list = raw.map((t) => parseTicket(t, priceCount));
  return list.some((t) => t == null) ? null : (list as PlanTicket[]);
}

/**
 * 驗證並正規化前端送來的 plan；不合法回 null。
 * ids 一律丟掉 —— 對照表只能由伺服器依資料庫狀態寫入。
 */
export function parseTicketPlan(raw: unknown): TicketPlan | null {
  if (!isObj(raw) || raw.version !== TICKET_PLAN_VERSION) return null;
  const kind = raw.kind === "workshop" || raw.kind === "party" || raw.kind === "festival" ? raw.kind : null;
  const days = int(raw.days, 1, 7);
  const tiered = bool(raw.tiered);
  if (!kind || days == null || tiered == null) return null;

  if (!Array.isArray(raw.tiers)) return null;
  const tiers: PlanTier[] = [];
  for (const t of raw.tiers) {
    if (!isObj(t)) return null;
    const key = typeof t.key === "string" && KEY_RE.test(t.key) ? t.key : null;
    const name = str(t.name, MAX_NAME);
    const endsAt = str(t.endsAt, 10);
    if (!key || name == null || !name.trim() || endsAt == null) return null;
    tiers.push({ key, name, endsAt });
  }
  if (tiered) {
    if (tiers.length < 2 || tiers.length > 6) return null;
    // 除了最後一段，截止日都要有，而且一段比一段晚
    for (let i = 0; i < tiers.length - 1; i++) {
      if (!DATE_RE.test(tiers[i].endsAt)) return null;
      if (i > 0 && tiers[i].endsAt <= tiers[i - 1].endsAt) return null;
    }
    tiers[tiers.length - 1].endsAt = "";
  }
  const tierCount = tiered ? tiers.length : 1;

  const gt = raw.groupTitles;
  if (!isObj(gt)) return null;
  const groupTitles = {
    full: str(gt.full, MAX_NAME),
    day: str(gt.day, MAX_NAME),
    classes: str(gt.classes, MAX_NAME),
    parties: str(gt.parties, MAX_NAME),
    entry: str(gt.entry, MAX_NAME),
  };
  if (Object.values(groupTitles).some((v) => !v || !v.trim())) return null;

  const full = raw.full;
  const day = raw.day;
  const classes = raw.classes;
  const parties = raw.parties;
  const entry = raw.entry;
  const pair = raw.pair;
  const early = raw.early;
  const coupon = raw.coupon;
  if (![full, day, classes, parties, entry, pair, early, coupon].every(isObj)) return null;
  const f = full as Record<string, unknown>;
  const d = day as Record<string, unknown>;
  const c = classes as Record<string, unknown>;
  const p = parties as Record<string, unknown>;
  const e = entry as Record<string, unknown>;
  const pr = pair as Record<string, unknown>;
  const eb = early as Record<string, unknown>;
  const cp = coupon as Record<string, unknown>;

  const fullTicket = parseTicket(f.ticket, tierCount);
  const fullEnabled = bool(f.enabled);
  const includesParty = bool(f.includesParty);
  const dayEnabled = bool(d.enabled);
  const samePrice = bool(d.samePrice);
  const dayTickets = parseTickets(d.tickets, tierCount, 7);
  const classesEnabled = bool(c.enabled);
  const classesTiered = bool(c.tiered);
  const partiesEnabled = bool(p.enabled);
  const partiesTiered = bool(p.tiered);
  if (
    !fullTicket || fullEnabled == null || includesParty == null ||
    dayEnabled == null || samePrice == null || !dayTickets ||
    classesEnabled == null || classesTiered == null ||
    partiesEnabled == null || partiesTiered == null
  ) {
    return null;
  }
  const classTickets = parseTickets(c.tickets, classesTiered ? tierCount : 1, 40);
  const partyTickets = parseTickets(p.tickets, partiesTiered ? tierCount : 1, 10);
  const entryTickets = parseTickets(e.tickets, tierCount, 6);
  if (!classTickets || !partyTickets || !entryTickets) return null;
  if (kind === "party" && entryTickets.length === 0) return null;

  const pairEnabled = bool(pr.enabled);
  const pairRate = typeof pr.rate === "number" && pr.rate > 0 && pr.rate < 10 ? pr.rate : null;
  const pairTicket = parseTicket(pr.ticket, tierCount);
  const earlyEnabled = bool(eb.enabled);
  const earlyTicket = parseTicket(eb.ticket, 1);
  const earlyTierIndex = int(eb.tierIndex, 0, Math.max(0, tierCount - 2));
  if (pairEnabled == null || pairRate == null || !pairTicket) return null;
  if (earlyEnabled == null || !earlyTicket || earlyTierIndex == null) return null;

  const couponEnabled = bool(cp.enabled);
  const couponCode = str(cp.code, 32);
  const couponRate = typeof cp.rate === "number" && cp.rate > 0 && cp.rate < 10 ? cp.rate : null;
  const usageLimit = cp.usageLimit == null ? null : int(cp.usageLimit, 1, 100_000);
  if (couponEnabled == null || couponCode == null || couponRate == null) return null;
  if (cp.usageLimit != null && usageLimit == null) return null;
  if (couponEnabled && !/^[A-Za-z0-9_-]{1,32}$/.test(couponCode.trim())) return null;

  // 至少要有一張票
  const plan: TicketPlan = {
    version: TICKET_PLAN_VERSION,
    kind,
    days,
    tiered,
    tiers: tiered ? tiers : [],
    groupTitles: groupTitles as TicketPlan["groupTitles"],
    full: { enabled: fullEnabled, includesParty, ticket: fullTicket },
    day: { enabled: dayEnabled, samePrice, tickets: dayTickets },
    classes: { enabled: classesEnabled, tiered: classesTiered, tickets: classTickets },
    parties: { enabled: partiesEnabled, tiered: partiesTiered, tickets: partyTickets },
    entry: { tickets: entryTickets },
    pair: { enabled: pairEnabled, rate: pairRate, ticket: pairTicket },
    early: { enabled: earlyEnabled, tierIndex: earlyTierIndex, ticket: earlyTicket },
    coupon: { enabled: couponEnabled, code: couponCode, rate: couponRate, usageLimit },
  };
  const compiled = compileTicketPlan(plan);
  if (compiled.items.length === 0) return null;
  // key 不可重複（對照表靠它）
  const keys = [...compiled.tiers.map((t) => `t:${t.key}`), ...compiled.items.map((i) => `i:${i.key}`)];
  if (new Set(keys).size !== keys.length) return null;
  return plan;
}
