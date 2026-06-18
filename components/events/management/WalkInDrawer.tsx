"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvent } from "@/hooks/use-event-detail";
import { usePublicEvent } from "@/hooks/use-public-event";
import { useCreateWalkIn } from "@/hooks/use-registrations";
import type { PublicEventData } from "@/types/event";

const ROLES = ["Leader", "Follower", "Not sure"] as const;

type Participant = { id: string; name: string; role: string };

type WalkInDrawerProps = {
  open: boolean;
  eventId: number;
  onClose: () => void;
  /** 建立成功後回呼（用於提示或刷新） */
  onSuccess?: () => void;
};

export function WalkInDrawer({ open, eventId, onClose, onSuccess }: WalkInDrawerProps) {
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

  // 項目單價（公開 API 已依當下時段解析）
  const amountById = new Map<number, number>();
  if (event) {
    for (const it of event.purchaseItems) amountById.set(it.id, it.amount);
    for (const g of event.groups) for (const it of g.items) amountById.set(it.id, it.amount);
  }

  const computedAmount =
    selectedItemIds().reduce((sum, id) => sum + (amountById.get(id) ?? 0), 0) *
    participants.length;

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
  const updateParticipant = (id: string, field: keyof Participant, value: string) =>
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  const addParticipant = () => setParticipants((prev) => [...prev, newParticipant()]);
  const removeParticipant = (id: string) =>
    setParticipants((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const handleSubmit = async () => {
    setError(null);
    if (!event) return;

    const ids = selectedItemIds();
    if (ids.length === 0) {
      setError("請選擇報名項目");
      return;
    }
    const validParticipants = participants
      .map((p) => ({ name: p.name.trim(), role: p.role }))
      .filter((p) => p.name && ROLES.includes(p.role as (typeof ROLES)[number]));
    if (validParticipants.length === 0) {
      setError("請至少填寫一位參加者的姓名與角色");
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
      setError(e instanceof Error ? e.message : "現場報名失敗");
    }
  };

  const isLoading = eventQuery.isLoading || publicEventQuery.isLoading;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="現場報名"
      subtitle="現金付款・即時報到"
    >
      {isLoading || !event ? (
        <p className="py-8 text-center text-sm text-gray-500">載入中…</p>
      ) : (
        <div className="space-y-6">
          {/* 報名項目 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              報名項目
              {event.activeTier ? (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  （{event.activeTier.name}）
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
                          （已包含於「{lockingGroup!.title}」）
                        </span>
                      )}
                    </p>
                    {group.items.map((item) => {
                      const isSelected = selected.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                            locked ? "cursor-not-allowed border-gray-200" : "cursor-pointer hover:bg-gray-50"
                          } ${isSelected ? "border-[#5295BC] bg-gray-50" : "border-gray-200"}`}
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
                            className="h-4 w-4 text-[#5295BC]"
                          />
                          <span className="flex-1 text-sm text-gray-900">{item.name}</span>
                          <span className="text-sm text-gray-600">${item.amount}</span>
                        </label>
                      );
                    })}
                    {isSingle && !group.required && !locked && (
                      <label
                        className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 ${
                          selected.length === 0 ? "border-[#5295BC] bg-gray-50" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`walkin-group-${group.id}`}
                          checked={selected.length === 0}
                          onChange={() => setGroupSelection(group, [])}
                          className="h-4 w-4 text-[#5295BC]"
                        />
                        <span className="flex-1 text-sm text-gray-900">不需要</span>
                      </label>
                    )}
                  </div>
                );
              })
            ) : (
              event.purchaseItems.map((item) => {
                const isSelected = allowMultiple
                  ? selectedPlanIds.includes(item.id)
                  : selectedPlanId === item.id;
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? "border-[#5295BC] bg-gray-50" : "border-gray-200"
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
                      className="h-4 w-4 text-[#5295BC]"
                    />
                    <span className="flex-1 text-sm text-gray-900">{item.name}</span>
                    <span className="text-sm text-gray-600">${item.amount}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* 參加者 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">參加者</h3>
            {participants.map((p, index) => (
              <div key={p.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">參加者 {index + 1}</span>
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.id)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="移除參加者"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="姓名"
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
                        className="h-4 w-4 text-[#5295BC]"
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
              className="w-full gap-1.5 border-[#5295BC] text-[#5295BC] hover:bg-[#5295BC]/10"
            >
              <Plus className="h-4 w-4" />
              增加參加者
            </Button>
          </div>

          {/* 聯絡人（選填） */}
          <div className="space-y-2">
            <Label htmlFor="walkin-contact">聯絡人姓名（選填，預設用第一位參加者）</Label>
            <Input
              id="walkin-contact"
              placeholder="聯絡人姓名"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          {/* 金額 */}
          <div className="space-y-2">
            <Label htmlFor="walkin-amount">收取金額（自動帶入，可修改）</Label>
            <Input
              id="walkin-amount"
              type="number"
              min={0}
              placeholder="金額"
              value={amountInput}
              onChange={(e) => {
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
              className="h-4 w-4 text-[#5295BC]"
            />
            建立後立即報到（標記為已入場）
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createWalkIn.isPending}
              className="bg-[#5295BC] text-white hover:bg-[#4285A5]"
            >
              {createWalkIn.isPending ? "建立中…" : "確認報名（現金）"}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
