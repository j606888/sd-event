"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvent } from "@/hooks/use-event-detail";
import { usePublicEvent } from "@/hooks/use-public-event";
import { useCreateWalkIn } from "@/hooks/use-registrations";
import type { EventPurchaseItem, PublicEventData } from "@/types/event";
import {
  computeItemsTotal,
  isBundleItem,
  requiredAttendeeCount,
  seatCountOf,
  findSeatCountMismatch,
} from "@/lib/seat-count";
import { findFlaggedShortfall, normalizeFlagLabel } from "@/lib/attendee-flag";
import { isItemOnSale } from "@/lib/pricing";

const ROLES = ["Leader", "Follower", "Not sure"] as const;

type Participant = { id: string; name: string; role: string; flagged?: boolean };

type WalkInDrawerProps = {
  open: boolean;
  eventId: number;
  /**
   * 管理員為 true，可修改收取金額。
   * 驗票人員為 false：金額改為唯讀（伺服器端同樣會忽略覆寫）。
   */
  canOverrideAmount?: boolean;
  onClose: () => void;
  /** 建立成功後回呼（用於提示或刷新） */
  onSuccess?: () => void;
};

export function WalkInDrawer({
  open,
  eventId,
  canOverrideAmount = true,
  onClose,
  onSuccess,
}: WalkInDrawerProps) {
  const t = useTranslations("registration");
  const tCommon = useTranslations("common");
  const eventQuery = useEvent(String(eventId));
  const publicKey = eventQuery.data?.publicKey;
  const publicEventQuery = usePublicEvent(publicKey);
  const event = publicEventQuery.data ?? null;

  const createWalkIn = useCreateWalkIn(String(eventId));

  // ----- 表單狀態 -----
  const seqRef = useRef(0);
  const newParticipant = (): Participant => ({
    id: `p-${seqRef.current++}`,
    name: "",
    role: "Leader",
  });

  const [participants, setParticipants] = useState<Participant[]>([newParticipant()]);
  const [contactName, setContactName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([]);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, number[]>>({});
  const [amountInput, setAmountInput] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 開啟時重置表單
  useEffect(() => {
    if (open) {
      seqRef.current = 0;
      setParticipants([newParticipant()]);
      setContactName("");
      setSelectedPlanId(null);
      setSelectedPlanIds([]);
      setSelectedByGroup({});
      setAmountInput("");
      setAmountEdited(false);
      setAutoCheckIn(true);
      setError(null);
      createWalkIn.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const useGroups = (event?.groups.length ?? 0) > 0;
  const allowMultiple = !!event?.allowMultiplePurchase;
  const effectiveMultiple = useGroups || allowMultiple;

  // 已選項目 id（依模式）
  const selectedItemIds = (): number[] => {
    if (!event) return [];
    if (useGroups) return Object.values(selectedByGroup).flat();
    if (allowMultiple) return selectedPlanIds;
    return selectedPlanId != null ? [selectedPlanId] : [];
  };

  // 項目（單價已由公開 API 依當下時段解析）
  const itemById = new Map<number, EventPurchaseItem>();
  if (event) {
    for (const it of event.purchaseItems) itemById.set(it.id, it);
    for (const g of event.groups) for (const it of g.items) itemById.set(it.id, it);
  }
  const selectedItems = selectedItemIds()
    .map((id) => itemById.get(id))
    .filter((it): it is EventPurchaseItem => it != null);

  // 一般票 單價 × 人數、套票 整組價（與伺服器一致）
  const computedAmount = computeItemsTotal(
    selectedItems.map((it) => ({ unitPrice: it.amount, seatCount: it.seatCount })),
    participants.length
  );

  // 選了套票 → 參加者人數固定為套票人數
  const requiredParticipants = requiredAttendeeCount(selectedItems);
  const bundleItem = selectedItems.find(isBundleItem) ?? null;
  useEffect(() => {
    if (requiredParticipants == null) return;
    setParticipants((prev) => {
      if (prev.length === requiredParticipants) return prev;
      if (prev.length > requiredParticipants) return prev.slice(0, requiredParticipants);
      return [
        ...prev,
        ...Array.from({ length: requiredParticipants - prev.length }, newParticipant),
      ];
    });
  }, [requiredParticipants]);

  // 未手動編輯時，金額隨選取/人數自動更新
  useEffect(() => {
    if (!amountEdited) {
      setAmountInput(computedAmount > 0 ? String(computedAmount) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedAmount, amountEdited]);

  // 群組互斥：回傳鎖住本群組的群組（若有）
  const getLockingGroup = (group: PublicEventData["groups"][number]) => {
    if (!event) return null;
    const byId = new Map(event.groups.map((g) => [g.id, g]));
    for (const exId of group.excludesGroupIds ?? []) {
      const other = byId.get(exId);
      if (other && (selectedByGroup[exId]?.length ?? 0) > 0) return other;
    }
    return null;
  };

  const setGroupSelection = (
    group: PublicEventData["groups"][number],
    ids: number[]
  ) => {
    setSelectedByGroup((prev) => {
      const next = { ...prev, [group.id]: ids };
      if (ids.length > 0) {
        for (const exId of group.excludesGroupIds ?? []) next[exId] = [];
      }
      return next;
    });
  };

  // ----- 參加者操作 -----
  const updateParticipant = (id: string, field: "name" | "role", value: string) =>
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  const toggleParticipantFlag = (id: string, flagged: boolean) =>
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, flagged } : p)));
  const flagLabel = normalizeFlagLabel(event?.attendeeFlagLabel);
  const addParticipant = () => setParticipants((prev) => [...prev, newParticipant()]);
  const removeParticipant = (id: string) =>
    setParticipants((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const handleSubmit = async () => {
    setError(null);
    if (!event) return;

    const ids = selectedItemIds();
    if (ids.length === 0) {
      setError(t("walkIn.selectItem"));
      return;
    }
    const validParticipants = participants
      .map((p) => ({
        name: p.name.trim(),
        role: p.role,
        flagged: flagLabel != null && p.flagged === true,
      }))
      .filter((p) => p.name && ROLES.includes(p.role as (typeof ROLES)[number]));
    if (validParticipants.length === 0) {
      setError(t("form.atLeastOneAttendee"));
      return;
    }
    const seatMismatch = findSeatCountMismatch(selectedItems, validParticipants.length);
    if (seatMismatch) {
      setError(t("form.seatCountMismatch", seatMismatch));
      return;
    }
    const flagShortfall = findFlaggedShortfall(
      selectedItems,
      validParticipants.filter((p) => p.flagged).length,
      flagLabel
    );
    if (flagShortfall) {
      setError(t("form.flaggedShortfall", flagShortfall));
      return;
    }
    const name = contactName.trim() || validParticipants[0].name;
    const amountNum = Math.floor(Number(amountInput));

    try {
      await createWalkIn.mutateAsync({
        purchaseItemId: effectiveMultiple ? null : (ids[0] ?? null),
        purchaseItemIds: effectiveMultiple ? ids : [],
        contactName: name,
        attendees: validParticipants,
        totalAmount: Number.isInteger(amountNum) && amountNum > 0 ? amountNum : undefined,
        autoCheckIn,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("walkIn.failed"));
    }
  };

  const isLoading = eventQuery.isLoading || publicEventQuery.isLoading;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("walkIn.title")}
      subtitle={t("walkIn.subtitle")}
    >
      {isLoading || !event ? (
        <p className="py-8 text-center text-sm text-gray-500">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-6">
          {/* 報名項目 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              <span>{t("itemsHeading")}</span>
              {event.activeTier ? (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {t("tierSuffix", { tier: event.activeTier.name })}
                </span>
              ) : null}
            </h3>
            {useGroups ? (
              event.groups.map((group) => {
                const lockingGroup = getLockingGroup(group);
                const locked = lockingGroup != null;
                const selected = locked ? [] : selectedByGroup[group.id] ?? [];
                const isSingle = group.selectionMode === "single";
                return (
                  <div key={group.id} className={`space-y-2 ${locked ? "opacity-50" : ""}`}>
                    <p className="text-xs font-medium text-gray-700">
                      {group.title}
                      {group.required && <span className="ml-1 text-red-500">*</span>}
                      {locked && (
                        <span className="ml-2 text-gray-400">
                          {t("walkIn.lockedBy", { group: lockingGroup!.title })}
                        </span>
                      )}
                    </p>
                    {/* 時段限定票（如早鳥限定已截止）現場不販售，伺服器也會擋 */}
                    {group.items.filter(isItemOnSale).map((item) => {
                      const isSelected = selected.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                            locked ? "cursor-not-allowed border-gray-200" : "cursor-pointer hover:bg-gray-50"
                          } ${isSelected ? "border-brand bg-brand/5" : "border-gray-200"}`}
                        >
                          <input
                            type={isSingle ? "radio" : "checkbox"}
                            name={`walkin-group-${group.id}`}
                            checked={isSelected}
                            disabled={locked}
                            onChange={() => {
                              if (isSingle) setGroupSelection(group, [item.id]);
                              else
                                setGroupSelection(
                                  group,
                                  isSelected
                                    ? selected.filter((id) => id !== item.id)
                                    : [...selected, item.id]
                                );
                            }}
                            className="h-4 w-4 text-brand-strong"
                          />
                          <WalkInItemName item={item} />
                          <span className="text-sm text-gray-600">
                            {seatCountOf(item) > 1
                              ? t("walkIn.priceForSeats", {
                                  amount: String(item.amount),
                                  seats: seatCountOf(item),
                                })
                              : `$${item.amount}`}
                          </span>
                        </label>
                      );
                    })}
                    {isSingle && !group.required && !locked && (
                      <label
                        className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 ${
                          selected.length === 0 ? "border-brand bg-brand/5" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`walkin-group-${group.id}`}
                          checked={selected.length === 0}
                          onChange={() => setGroupSelection(group, [])}
                          className="h-4 w-4 text-brand-strong"
                        />
                        <span className="flex-1 text-sm text-gray-900">
                          {t("walkIn.noneOption")}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })
            ) : (
              event.purchaseItems.filter(isItemOnSale).map((item) => {
                const isSelected = allowMultiple
                  ? selectedPlanIds.includes(item.id)
                  : selectedPlanId === item.id;
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? "border-brand bg-brand/5" : "border-gray-200"
                    }`}
                  >
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name={allowMultiple ? `walkin-plan-${item.id}` : "walkin-plan"}
                      checked={isSelected}
                      onChange={() => {
                        if (allowMultiple) {
                          setSelectedPlanIds((prev) =>
                            isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          );
                          setSelectedPlanId(null);
                        } else {
                          setSelectedPlanId(item.id);
                          setSelectedPlanIds([]);
                        }
                      }}
                      className="h-4 w-4 text-brand-strong"
                    />
                    <WalkInItemName item={item} />
                    <span className="text-sm text-gray-600">
                      {seatCountOf(item) > 1
                        ? t("walkIn.priceForSeats", {
                            amount: String(item.amount),
                            seats: seatCountOf(item),
                          })
                        : `$${item.amount}`}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* 參加者 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{t("form.attendeesHeading")}</h3>
            {bundleItem && requiredParticipants != null && (
              <p className="rounded-lg bg-brand/5 p-2.5 text-xs text-gray-700">
                <span>
                  {t("walkIn.bundleHint", {
                    name: bundleItem.name,
                    count: requiredParticipants,
                  })}
                </span>
                {bundleItem.description && (
                  <span className="mt-1 block whitespace-pre-line text-gray-600">
                    {bundleItem.description}
                  </span>
                )}
              </p>
            )}
            {participants.map((p, index) => (
              <div key={p.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {t("form.attendeeN", { n: index + 1 })}
                  </span>
                  {participants.length > 1 && requiredParticipants == null && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.id)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label={t("form.removeAttendee")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder={t("form.namePlaceholder")}
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, "name", e.target.value)}
                />
                <div className="flex gap-4">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`walkin-role-${p.id}`}
                        checked={p.role === role}
                        onChange={() => updateParticipant(p.id, "role", role)}
                        className="h-4 w-4 text-brand-strong"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                {flagLabel && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={p.flagged === true}
                      onChange={(e) => toggleParticipantFlag(p.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand"
                    />
                    {flagLabel}
                  </label>
                )}
              </div>
            ))}
            {requiredParticipants == null && (
              <Button
                type="button"
                variant="outline"
                onClick={addParticipant}
                className="w-full gap-1.5 border-brand text-brand-strong hover:bg-brand/10"
              >
                <Plus className="h-4 w-4" />
                <span>{t("form.addAttendee")}</span>
              </Button>
            )}
          </div>

          {/* 聯絡人（選填） */}
          <div className="space-y-2">
            <Label htmlFor="walkin-contact">{t("walkIn.contactLabel")}</Label>
            <Input
              id="walkin-contact"
              placeholder={t("walkIn.contactPlaceholder")}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          {/* 金額 */}
          <div className="space-y-2">
            <Label htmlFor="walkin-amount">
              {canOverrideAmount
                ? t("walkIn.amountLabelEditable")
                : t("walkIn.amountLabelReadOnly")}
            </Label>
            <Input
              id="walkin-amount"
              type="number"
              min={0}
              placeholder={t("form.amountPlaceholder")}
              value={amountInput}
              readOnly={!canOverrideAmount}
              aria-readonly={!canOverrideAmount}
              className={canOverrideAmount ? undefined : "bg-field text-gray-600"}
              onChange={(e) => {
                if (!canOverrideAmount) return;
                setAmountEdited(true);
                setAmountInput(e.target.value);
              }}
            />
          </div>

          {/* 立即報到 */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheckIn}
              onChange={(e) => setAutoCheckIn(e.target.checked)}
              className="h-4 w-4 text-brand-strong"
            />
            <span>{t("walkIn.autoCheckIn")}</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createWalkIn.isPending}
              className="bg-brand text-ink hover:bg-brand-hover"
            >
              {createWalkIn.isPending ? tCommon("creating") : t("walkIn.submit")}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

/** 項目名稱 + 套票人數 / 說明（現場報名用的精簡版） */
function WalkInItemName({ item }: { item: EventPurchaseItem }) {
  const t = useTranslations("registration.walkIn");
  const seats = seatCountOf(item);
  return (
    <span className="flex-1 text-sm text-gray-900">
      {item.name}
      {seats > 1 && (
        <span className="ml-1.5 rounded bg-brand/10 px-1 py-0.5 text-xs font-medium text-brand-strong">
          {t("bundleBadge", { seats })}
        </span>
      )}
      {item.description && (
        <span className="mt-0.5 block whitespace-pre-line text-xs text-gray-500">
          {item.description}
        </span>
      )}
    </span>
  );
}
