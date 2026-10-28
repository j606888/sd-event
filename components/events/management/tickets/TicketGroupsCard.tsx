"use client";

import {
  Ellipsis,
  Eye,
  EyeOff,
  LayoutList,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
  PurchaseItemDraft,
  PurchaseItemGroupDraft,
  UseEventFormReturn,
} from "@/hooks/use-event-form";

const groupKeyOf = (group: PurchaseItemGroupDraft, groupIndex: number) =>
  group.id != null ? `id-${group.id}` : `draft-${groupIndex}`;

const itemGroupKey = (item: PurchaseItemDraft) => {
  if (item.groupId != null) return `id-${item.groupId}`;
  if (item.groupDraftIndex != null) return `draft-${item.groupDraftIndex}`;
  return null;
};

/**
 * 區塊的選擇規則。
 *
 * 資料層是 `selectionMode`（single/multiple）× `required`（必選/可跳過）兩個欄位，
 * 但要主辦人自己把兩個開關乘起來才知道報名者會遇到什麼。這裡把四種組合各給一個
 * 白話名字，設定時只做一個決定 —— 語意與 `lib/registration-pricing.ts` 的
 * `validateGroupSelection()` 四個分支一一對應，沒有任何行為變動。
 */
type RuleKey =
  | "single-required"
  | "single-optional"
  | "multiple-required"
  | "multiple-optional";

const RULE_OPTIONS: {
  value: RuleKey;
  labelKey: "singleRequired" | "singleOptional" | "multipleRequired" | "multipleOptional";
}[] = [
  { value: "single-required", labelKey: "singleRequired" },
  { value: "single-optional", labelKey: "singleOptional" },
  { value: "multiple-required", labelKey: "multipleRequired" },
  { value: "multiple-optional", labelKey: "multipleOptional" },
];

const ruleKeyOf = (group: PurchaseItemGroupDraft): RuleKey =>
  `${group.selectionMode}-${group.required ? "required" : "optional"}` as RuleKey;

const parseRuleKey = (
  key: RuleKey
): { selectionMode: "single" | "multiple"; required: boolean } => {
  const [mode, req] = key.split("-");
  return {
    selectionMode: mode === "multiple" ? "multiple" : "single",
    required: req === "required",
  };
};

/**
 * 票券內容卡：票券清單＋票券區塊（一級功能）。
 * 無區塊時為平面清單；有區塊時每個區塊一張卡，各自有規則設定與「＋新增票券」。
 */
export function TicketGroupsCard({ form }: { form: UseEventFormReturn }) {
  const {
    purchaseItems,
    priceTiers,
    groups,
    groupExclusions,
    openPurchaseItemAdder,
    openPurchaseItemEditor,
    deletePurchaseItem,
    purchaseItemDeletingIndex,
    setPurchaseItemHidden,
    purchaseItemHiddenUpdatingIndex,
    assignItemGroup,
    addGroup,
    updateGroup,
    persistGroup,
    removeGroup,
  } = form;
  const t = useTranslations("tickets");
  const tRules = useTranslations("tickets.groups.rules");
  const tCommon = useTranslations("common");

  const useGroups = groups.length > 0;
  const indexedItems = purchaseItems.map((item, index) => ({ item, index }));

  /**
   * 「必選 + 互斥」是個做得出來、但報名者過不了的組合：
   * 後端 `validateGroupSelection` 先跑 required 檢查、再跑互斥檢查，所以只要另一個區塊
   * 有選取就會被必選擋下 —— 那個區塊等於永遠選不到。前端 `groupsSatisfied` 反而把被鎖住的
   * 必選區塊當作已滿足，會一路放行到送出才吃 400，因此在設定當下就先警告。
   */
  const conflictingTitles = (
    group: PurchaseItemGroupDraft,
    groupIndex: number
  ): string[] => {
    if (!group.required) return [];
    const selfKey = groupKeyOf(group, groupIndex);
    const partnerKeys = groupExclusions
      .filter((pair) => pair.includes(selfKey))
      .map(([a, b]) => (a === selfKey ? b : a));
    return groups
      .filter((g, gi) => partnerKeys.includes(groupKeyOf(g, gi)))
      .map((g) => g.title || t("untitledGroup"));
  };

  const renderItemRow = (
    item: PurchaseItemDraft,
    i: number,
    options?: { showAssignSelect?: boolean }
  ) => {
    const sold = item.soldCount ?? 0;
    const canDelete = sold === 0;
    // 有時段時只顯示各段價格（時段順序），不再另外露出 amount ——
    // amount 就是最後一段的價格，重複顯示只會讓人以為是另一個獨立的數字。
    const tierPriceLabel = priceTiers
      .map((tier, tierIndex) => {
        const price = (item.prices ?? []).find((p) =>
          tier.id != null ? p.tierId === tier.id : p.tierDraftIndex === tierIndex
        );
        if (!price) return null;
        const tierName = tier.name || t("tierN", { n: tierIndex + 1 });
        return price.available === false
          ? t("item.tierNotSold", { tier: tierName })
          : t("item.tierPrice", { tier: tierName, amount: price.amount.toLocaleString() });
      })
      .filter((label): label is string => label !== null)
      .join(" → ");

    const itemBody = (
      <>
        {item.name}
        {(item.seatCount ?? 1) > 1 && (
          <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand-strong">
            {t("item.bundle", { count: item.seatCount ?? 1 })}
          </span>
        )}
        {item.hidden ? (
          <span className="ml-2 text-xs text-gray-400">{t("item.hiddenOnForm")}</span>
        ) : null}
        <span className="block text-xs text-gray-500 sm:ml-2 sm:inline">
          {tierPriceLabel || `$${item.amount.toLocaleString()}`}
        </span>
      </>
    );
    return (
      <li
        key={item.id ?? `draft-${i}`}
        className="flex items-center justify-between gap-2 py-2.5 text-sm"
      >
        <button
          type="button"
          onClick={() => openPurchaseItemEditor(i)}
          className={`group -mx-1 flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-gray-100 ${
            item.hidden ? "text-gray-400" : "text-gray-700"
          }`}
          aria-label={t("item.editAria", { name: item.name })}
        >
          <span className="min-w-0">{itemBody}</span>
          <Pencil className="size-3.5 shrink-0 text-gray-300 group-hover:text-gray-500" />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {options?.showAssignSelect && (
            <select
              className="h-8 rounded-md border-0 bg-amber-50 px-2 text-xs text-amber-800"
              value=""
              onChange={(e) => {
                if (e.target.value) assignItemGroup(i, e.target.value);
              }}
              aria-label={t("item.moveAria", { name: item.name })}
            >
              <option value="">{t("item.movePlaceholder")}</option>
              {groups.map((group, gi) => (
                <option key={group.id ?? `draft-${gi}`} value={groupKeyOf(group, gi)}>
                  {group.title || t("untitledGroup")}
                </option>
              ))}
            </select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-600"
              aria-label={t("item.moreAria", { name: item.name })}
            >
              <Ellipsis className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openPurchaseItemEditor(i)}>
                <Pencil />
                <span>{tCommon("edit")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={purchaseItemHiddenUpdatingIndex === i}
                onSelect={() => setPurchaseItemHidden(i, !item.hidden)}
              >
                {item.hidden ? <Eye /> : <EyeOff />}
                <span>
                  {purchaseItemHiddenUpdatingIndex === i
                    ? tCommon("updating")
                    : item.hidden
                      ? t("item.showOnForm")
                      : t("item.hideFromForm")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!canDelete || purchaseItemDeletingIndex === i}
                onSelect={() => deletePurchaseItem(i)}
              >
                <Trash2 />
                <span>
                  {purchaseItemDeletingIndex === i
                    ? tCommon("deleting")
                    : canDelete
                      ? tCommon("delete")
                      : t("item.deleteBlocked")}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  const handleRemoveGroup = (index: number) => {
    const group = groups[index];
    const ok = window.confirm(
      t("groups.deleteConfirm", { title: group?.title || t("untitledGroup") })
    );
    if (!ok) return;
    removeGroup(index);
  };

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-ink">{t("groups.title")}</h3>
        {!useGroups && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => openPurchaseItemAdder()}
          >
            <Plus className="size-4" />
            <span>{t("groups.addTicket")}</span>
          </Button>
        )}
      </div>

      {!useGroups && (
        <>
          {purchaseItems.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {purchaseItems.map((item, i) => renderItemRow(item, i))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">{t("groups.noTickets")}</p>
          )}
          {/* 引導啟用票券區塊（原「群組」功能） */}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <LayoutList className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <p className="text-xs text-gray-500">
                {t("groups.enableHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => addGroup()}
            >
              {t("groups.enable")}
            </Button>
          </div>
        </>
      )}

      {useGroups && (
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => {
            const groupItems = indexedItems.filter(
              ({ item }) => itemGroupKey(item) === groupKeyOf(group, gi)
            );
            return (
              <div
                key={group.id ?? `draft-${gi}`}
                className="flex flex-col gap-2 border-l-2 border-brand/70 pl-3 sm:pl-4"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder={t("groups.namePlaceholder")}
                    value={group.title}
                    onChange={(e) => updateGroup(gi, "title", e.target.value)}
                    onBlur={() => persistGroup(gi)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(gi)}
                    className="flex size-8 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
                    aria-label={t("groups.deleteAria")}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`group-rule-${gi}`}
                    className="text-sm text-gray-600"
                  >
                    {t("groups.ruleLabel")}
                  </label>
                  <select
                    id={`group-rule-${gi}`}
                    className="h-9 min-w-0 flex-1 rounded-md border-0 bg-field px-2 text-sm text-ink sm:flex-none sm:min-w-[15rem]"
                    value={ruleKeyOf(group)}
                    onChange={(e) => {
                      const next = parseRuleKey(e.target.value as RuleKey);
                      updateGroup(gi, "selectionMode", next.selectionMode);
                      updateGroup(gi, "required", next.required);
                      persistGroup(gi, next);
                    }}
                  >
                    {RULE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {tRules(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                {conflictingTitles(group, gi).length > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {t("groups.requiredConflict", {
                        titles: conflictingTitles(group, gi).join(t("groups.titleSeparator")),
                      })}
                    </span>
                  </p>
                )}
                {groupItems.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-hairline">
                    {groupItems.map(({ item, index }) => renderItemRow(item, index))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">{t("groups.emptyGroup")}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 self-start"
                  onClick={() => openPurchaseItemAdder(groupKeyOf(group, gi))}
                >
                  <Plus className="size-4" />
                  <span>{t("groups.addTicket")}</span>
                </Button>
              </div>
            );
          })}

          {(() => {
            const ungrouped = indexedItems.filter(
              ({ item }) => itemGroupKey(item) === null
            );
            if (ungrouped.length === 0) return null;
            return (
              <div className="flex flex-col gap-1 border-l-2 border-amber-400 pl-3 sm:pl-4">
                <p className="text-sm font-medium text-amber-700">
                  {t("groups.ungroupedTitle")}
                </p>
                <p className="text-xs text-amber-700/80">
                  {t("groups.ungroupedHint")}
                </p>
                <ul className="flex flex-col divide-y divide-hairline">
                  {ungrouped.map(({ item, index }) =>
                    renderItemRow(item, index, { showAssignSelect: true })
                  )}
                </ul>
              </div>
            );
          })()}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 self-start"
            onClick={() => addGroup()}
          >
            <Plus className="size-4" />
            <span>{t("groups.addGroup")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
