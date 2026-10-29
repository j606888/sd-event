import { describe, expect, it } from "vitest";
import {
  alignPlanPrices,
  compileTicketPlan,
  createDefaultTicketPlan,
  pairPrice,
  parseTicketPlan,
  rateToPercentOff,
  spliceTierPrices,
  syncDayPasses,
  type PlanLabels,
  type TicketPlan,
} from "./ticket-plan";

const labels: PlanLabels = {
  groupTitles: { full: "Full Pass", day: "Day Pass", classes: "單堂課", parties: "Party", entry: "入場票" },
  tierNames: { superEarly: "Super Early Bird", early: "Early Bird", door: "一般／現場" },
  fullPass: "Full Pass",
  dayPass: (n) => `Day ${n} Pass`,
  partyEntry: "Party 入場",
  pairName: (base) => `雙人 ${base}`,
  bundleNote: "一組 2 人",
  earlyName: "1+1 早鳥票",
};

let seq = 0;
const newKey = () => `k${++seq}`;

function workshop(): TicketPlan {
  const plan = createDefaultTicketPlan({
    kind: "workshop",
    dayDates: ["12/12（六）", "12/13（日）"],
    tierEnds: ["2026-11-08", "2026-11-29"],
    labels,
    newKey,
  });
  return {
    ...plan,
    day: { ...plan.day, enabled: true },
    classes: {
      enabled: true,
      tiered: false,
      tickets: [
        { key: "c1", name: "Body Movement", note: "14:00–15:00", prices: [800], day: 1 },
        { key: "c2", name: "Musicality", note: "13:00–14:15", prices: [800], day: 2 },
      ],
    },
    parties: {
      enabled: true,
      tiered: false,
      tickets: [{ key: "p1", name: "Saturday Night Party", note: "12/12 21:00", prices: [600] }],
    },
  };
}

describe("compileTicketPlan", () => {
  it("splits a workshop into Full Pass / Day Pass / classes / parties blocks", () => {
    const compiled = compileTicketPlan(workshop());
    expect(compiled.groups.map((g) => [g.key, g.selectionMode, g.required])).toEqual([
      ["full", "single", false],
      ["day", "single", false],
      ["classes", "multiple", false],
      ["parties", "multiple", false],
    ]);
    // Full Pass 含 Party → 鎖住 Day Pass、單堂課、Party
    expect(compiled.exclusions).toEqual([
      ["full", "day"],
      ["full", "classes"],
      ["full", "parties"],
    ]);
  });

  it("does not lock parties when the Full Pass excludes them", () => {
    const plan = workshop();
    plan.full.includesParty = false;
    expect(compileTicketPlan(plan).exclusions).not.toContainEqual(["full", "parties"]);
  });

  it("writes one price per tier, repeating the price for same-price tickets", () => {
    const compiled = compileTicketPlan(workshop());
    const full = compiled.items.find((i) => i.key === "full")!;
    expect(full.prices.map((p) => p.amount)).toEqual([3000, 3500, 4000]);
    expect(full.amount).toBe(4000);
    expect(full.flat).toBe(false);
    // 單堂課不分階段：每段都寫同價（進階模式才不會警告缺價），畫面上當成單一價
    const cls = compiled.items.find((i) => i.key === "c1")!;
    expect(cls.prices.map((p) => p.amount)).toEqual([800, 800, 800]);
    expect(cls.flat).toBe(true);
    expect(cls.amount).toBe(800);
    expect(cls.name).toBe("Day 1 · Body Movement");
    expect(cls.description).toBe("14:00–15:00");
  });

  it("sells the early-bird bundle only in its tier", () => {
    const plan = workshop();
    plan.early.enabled = true;
    const early = compileTicketPlan(plan).items.find((i) => i.key === "early")!;
    expect(early.seatCount).toBe(2);
    expect(early.groupKey).toBe("full");
    expect(early.prices.map((p) => p.available)).toEqual([true, false, false]);
  });

  it("makes the only block required for a pure party", () => {
    const plan = createDefaultTicketPlan({
      kind: "party",
      dayDates: [],
      tierEnds: ["2026-11-08", "2026-11-29"],
      labels,
      newKey,
    });
    const compiled = compileTicketPlan(plan);
    expect(compiled.groups).toHaveLength(1);
    expect(compiled.groups[0]).toMatchObject({ key: "entry", required: true });
    expect(compiled.items.map((i) => i.key)).toEqual(["entry"]);
  });

  it("drops tiers and per-tier prices for a single price", () => {
    const plan = alignPlanPrices({ ...workshop(), tiered: false, tiers: [] });
    const compiled = compileTicketPlan(plan);
    expect(compiled.tiers).toEqual([]);
    expect(compiled.items.every((i) => i.prices.length === 0)).toBe(true);
  });
});

describe("price helpers", () => {
  it("computes pair prices and coupon percentages from 折數", () => {
    expect(pairPrice(3000, 9)).toBe(5400);
    expect(rateToPercentOff(9)).toBe(10);
    expect(rateToPercentOff(8.5)).toBe(15);
  });

  it("keeps each ticket's prices in step when a tier is inserted or removed", () => {
    const plan = workshop();
    const inserted = spliceTierPrices(plan, 1, "insert");
    expect(inserted.full.ticket.prices).toEqual([3000, 3500, 3500, 4000]);
    expect(inserted.classes.tickets[0].prices).toEqual([800]);
    const removed = spliceTierPrices(plan, 0, "remove");
    expect(removed.full.ticket.prices).toEqual([3500, 4000]);
  });

  it("keeps a day's pass when the day count changes", () => {
    const plan = workshop();
    plan.day.tickets[0].prices = [1, 2, 3];
    const three = syncDayPasses({ ...plan, days: 3 }, ["a", "b", "c"], labels.dayPass);
    expect(three.day.tickets.map((t) => t.key)).toEqual(["day-1", "day-2", "day-3"]);
    expect(three.day.tickets[0].prices).toEqual([1, 2, 3]);
  });
});

describe("parseTicketPlan", () => {
  it("accepts a plan built by the wizard and strips server ids", () => {
    const plan = { ...workshop(), ids: { tiers: {}, groups: {}, items: { full: 1 } } };
    const parsed = parseTicketPlan(JSON.parse(JSON.stringify(plan)));
    expect(parsed).not.toBeNull();
    expect(parsed!.ids).toBeUndefined();
  });

  it("rejects tier deadlines that go backwards", () => {
    const plan = workshop();
    plan.tiers[1].endsAt = "2026-11-01";
    expect(parseTicketPlan(plan)).toBeNull();
  });

  it("rejects a plan with no tickets at all", () => {
    const plan = workshop();
    plan.full.enabled = false;
    plan.day.enabled = false;
    plan.classes.enabled = false;
    plan.parties.enabled = false;
    expect(parseTicketPlan(plan)).toBeNull();
  });

  it("rejects price lists that don't match the tiers", () => {
    const plan = workshop();
    plan.full.ticket.prices = [3000, 3500];
    expect(parseTicketPlan(plan)).toBeNull();
  });

  it("rejects blank class names", () => {
    const plan = workshop();
    plan.classes.tickets[0].name = "  ";
    expect(parseTicketPlan(plan)).toBeNull();
  });
});
