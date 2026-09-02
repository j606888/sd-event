import type {
  PriceTierDraft,
  PurchaseItemGroupDraft,
  PurchaseItemDraft,
} from "@/hooks/use-event-form";
import { taipeiDateInput } from "@/lib/format-event-date";

/** 活動類型；用於決定購買項目範本 */
export type EventType = "Party" | "Workshop" | "Festival";

/** 類型選單文案（建立活動時的範本選擇器用） */
export const EVENT_TYPES: {
  value: EventType;
  label: string;
  description: string;
}[] = [
  {
    value: "Party",
    label: "Party",
    description: "單一入場票，搭配早鳥優惠時段價。",
  },
  {
    value: "Workshop",
    label: "Workshop",
    description: "Full Pass 或單堂購買，可加購 Party，含早鳥／現場價。",
  },
  {
    value: "Festival",
    label: "Festival",
    description: "綜合方案：Pass、單堂課、Party，多檔早鳥時段。",
  },
];

/** 範本：可灌入表單 draft 狀態的票價時段／群組／購買項目／群組互斥 */
export type EventTemplate = {
  priceTiers: PriceTierDraft[];
  groups: PurchaseItemGroupDraft[];
  purchaseItems: PurchaseItemDraft[];
  /** 群組互斥配對；key 沿用表單慣例 `draft-<groupIndex>` */
  groupExclusions: Array<[string, string]>;
};

/**
 * 範本裡的時段用「距今幾天」表示，取用時才換算成實際日期。
 *
 * 時段是依 `sortOrder` 取第一個尚未截止的段（`lib/pricing.ts` 的 `resolveActiveTier`），
 * 所以除了最後的 fallback 段以外，每一段都必須有截止日 —— 否則整場活動會永遠停在第一段
 * （早鳥價收到天荒地老）。範本先給一組合理的預設日期，主辦人再依實際檔期調整。
 *
 * `daysFromNow: null` = fallback 段（現場價），永不過期。
 */
type TemplateTier = {
  name: string;
  sortOrder: number;
  daysFromNow: number | null;
};

type EventTemplateSource = Omit<EventTemplate, "priceTiers"> & {
  priceTiers: TemplateTier[];
};

/** 距今 n 天的台北日期，轉成 date input 用的 "YYYY-MM-DD" */
function dateInputInDays(days: number): string {
  return taipeiDateInput(new Date(Date.now() + days * 86_400_000).toISOString());
}

/** 範本時段 → draft 時段（把 daysFromNow 換算成實際截止日） */
function resolveTemplateTiers(tiers: TemplateTier[]): PriceTierDraft[] {
  return tiers.map((t) => ({
    name: t.name,
    sortOrder: t.sortOrder,
    endsAt: t.daysFromNow == null ? "" : dateInputInDays(t.daysFromNow),
  }));
}

/** 把 amounts[i] 對應到 tierDraftIndex i，產生範本用的時段價陣列（範例價，使用者可改） */
function pricesFor(amounts: number[]) {
  return amounts.map((amount, i) => ({ tierDraftIndex: i, amount }));
}

const PARTY_TEMPLATE: EventTemplateSource = {
  priceTiers: [
    { name: "超早鳥", daysFromNow: 14, sortOrder: 0 },
    { name: "早鳥", daysFromNow: 28, sortOrder: 1 },
    { name: "一般 / 現場", daysFromNow: null, sortOrder: 2 },
  ],
  groups: [],
  purchaseItems: [
    { name: "Party 入場票", amount: 450, prices: pricesFor([300, 350, 450]) },
  ],
  groupExclusions: [],
};

const WORKSHOP_TEMPLATE: EventTemplateSource = {
  priceTiers: [
    { name: "早鳥", daysFromNow: 30, sortOrder: 0 },
    { name: "一般 / 現場", daysFromNow: null, sortOrder: 1 },
  ],
  groups: [
    { title: "課程方案", selectionMode: "single", required: true, sortOrder: 0 },
    { title: "加購", selectionMode: "multiple", required: false, sortOrder: 1 },
  ],
  purchaseItems: [
    {
      name: "Full Pass（含 Party）",
      amount: 2200,
      groupDraftIndex: 0,
      prices: pricesFor([1800, 2200]),
    },
    {
      name: "單堂課",
      amount: 700,
      groupDraftIndex: 0,
      prices: pricesFor([600, 700]),
    },
    {
      name: "加購 Party",
      amount: 400,
      groupDraftIndex: 1,
      prices: pricesFor([300, 400]),
    },
  ],
  groupExclusions: [],
};

const FESTIVAL_TEMPLATE: EventTemplateSource = {
  priceTiers: [
    { name: "超早鳥", daysFromNow: 21, sortOrder: 0 },
    { name: "早鳥", daysFromNow: 45, sortOrder: 1 },
    { name: "一般", daysFromNow: 75, sortOrder: 2 },
    { name: "現場", daysFromNow: null, sortOrder: 3 },
  ],
  groups: [
    { title: "Pass 方案", selectionMode: "single", required: true, sortOrder: 0 },
    { title: "單堂課", selectionMode: "multiple", required: false, sortOrder: 1 },
    { title: "Party", selectionMode: "multiple", required: false, sortOrder: 2 },
  ],
  purchaseItems: [
    {
      name: "Full Pass（含 Party）",
      amount: 4500,
      groupDraftIndex: 0,
      prices: pricesFor([3000, 3500, 4000, 4500]),
    },
    {
      name: "Full Pass（不含 Party）",
      amount: 4000,
      groupDraftIndex: 0,
      prices: pricesFor([2500, 3000, 3500, 4000]),
    },
    {
      name: "單日 Pass",
      amount: 2200,
      groupDraftIndex: 0,
      prices: pricesFor([1500, 1800, 2000, 2200]),
    },
    {
      name: "單堂課",
      amount: 900,
      groupDraftIndex: 1,
      prices: pricesFor([600, 700, 800, 900]),
    },
    {
      name: "週五 Party",
      amount: 600,
      groupDraftIndex: 2,
      prices: pricesFor([400, 450, 500, 600]),
    },
    {
      name: "週六 Party",
      amount: 600,
      groupDraftIndex: 2,
      prices: pricesFor([400, 450, 500, 600]),
    },
  ],
  // 群組互斥是「群組層級」，無法表達「只有含 Party 的 Full Pass 才鎖 Party 群組」
  // 這類項目層級條件，故 Festival 互斥留空，交由使用者自行設定。
  groupExclusions: [],
};

const TEMPLATES: Record<EventType, EventTemplateSource> = {
  Party: PARTY_TEMPLATE,
  Workshop: WORKSHOP_TEMPLATE,
  Festival: FESTIVAL_TEMPLATE,
};

/** 取得某類型的購買項目範本（回傳深拷貝，避免表單修改污染常數） */
export function getEventTemplate(type: EventType): EventTemplate {
  const t = TEMPLATES[type] ?? PARTY_TEMPLATE;
  return {
    priceTiers: resolveTemplateTiers(t.priceTiers),
    groups: t.groups.map((x) => ({ ...x })),
    purchaseItems: t.purchaseItems.map((x) => ({
      ...x,
      prices: x.prices?.map((p) => ({ ...p })),
    })),
    groupExclusions: t.groupExclusions.map(([a, b]): [string, string] => [a, b]),
  };
}

export function isEventType(value: unknown): value is EventType {
  return value === "Party" || value === "Workshop" || value === "Festival";
}
