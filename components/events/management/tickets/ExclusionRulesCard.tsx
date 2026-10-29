"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PurchaseItemGroupDraft, UseEventFormReturn } from "@/hooks/use-event-form";

const groupKeyOf = (group: PurchaseItemGroupDraft, groupIndex: number) =>
  group.id != null ? `id-${group.id}` : `draft-${groupIndex}`;

/**
 * 互斥規則卡：集中列出「A 與 B 不能同時選」的規則（取代舊版每個群組下重複的核取方塊）。
 * 僅在有 ≥2 個票券區塊時顯示。
 */
export function ExclusionRulesCard({ form }: { form: UseEventFormReturn }) {
  const { groups, groupExclusions, toggleGroupExclusion } = form;
  const t = useTranslations("tickets");
  const tCommon = useTranslations("common");
  const [pickA, setPickA] = useState("");
  const [pickB, setPickB] = useState("");
  const [adding, setAdding] = useState(false);

  if (groups.length < 2) return null;

  const titleByKey = new Map(
    groups.map((g, i) => [groupKeyOf(g, i), g.title || t("untitledGroup")])
  );

  // 只render兩端都還存在的規則（群組被刪時 hook 會同步清掉，這裡再保險一次）
  const visiblePairs = groupExclusions.filter(
    ([a, b]) => titleByKey.has(a) && titleByKey.has(b)
  );

  const existingPair = (a: string, b: string) =>
    groupExclusions.some(
      (p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)
    );

  const optionsForB = groups
    .map((g, i) => ({ key: groupKeyOf(g, i), title: g.title || t("untitledGroup") }))
    .filter((o) => o.key !== pickA && (!pickA || !existingPair(pickA, o.key)));

  const confirmAdd = () => {
    if (!pickA || !pickB || pickA === pickB) return;
    toggleGroupExclusion(pickA, pickB);
    setPickA("");
    setPickB("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">{t("exclusions.title")}</h3>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
            <span>{t("exclusions.add")}</span>
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {t("exclusions.description")}
      </p>

      {visiblePairs.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {visiblePairs.map(([a, b]) => (
            <li
              key={`${a}|${b}`}
              className="flex items-center justify-between gap-2 rounded-md bg-field px-3 py-2 text-sm text-gray-700"
            >
              <span>
                {t.rich("exclusions.rule", {
                  a: titleByKey.get(a) ?? "",
                  b: titleByKey.get(b) ?? "",
                  name: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
              </span>
              <button
                type="button"
                onClick={() => toggleGroupExclusion(a, b)}
                className="flex size-7 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                aria-label={t("exclusions.removeAria")}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-gray-300 p-2">
          <select
            className="h-9 min-w-[8rem] flex-1 rounded-md border-0 bg-field px-2 text-sm shadow-xs"
            value={pickA}
            onChange={(e) => {
              setPickA(e.target.value);
              if (e.target.value === pickB) setPickB("");
            }}
            aria-label={t("exclusions.groupAAria")}
          >
            <option value="">{t("exclusions.pickPlaceholder")}</option>
            {groups.map((g, i) => (
              <option key={g.id ?? `draft-${i}`} value={groupKeyOf(g, i)}>
                {g.title || t("untitledGroup")}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">{t("exclusions.and")}</span>
          <select
            className="h-9 min-w-[8rem] flex-1 rounded-md border-0 bg-field px-2 text-sm shadow-xs"
            value={pickB}
            onChange={(e) => setPickB(e.target.value)}
            aria-label={t("exclusions.groupBAria")}
          >
            <option value="">{t("exclusions.pickPlaceholder")}</option>
            {optionsForB.map((o) => (
              <option key={o.key} value={o.key}>
                {o.title}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">{t("exclusions.cannotCombine")}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!pickA || !pickB}
              onClick={confirmAdd}
              className="bg-brand text-ink hover:bg-brand-hover"
            >
              {t("exclusions.confirm")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setPickA("");
                setPickB("");
              }}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
