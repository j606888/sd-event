"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { siLine } from "simple-icons";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { LinePayeeFields } from "@/components/events/management/LinePayeeFields";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import { validateLineIdInput } from "@/lib/line";

type LinePayee = {
  id: number;
  teamId: number;
  label: string;
  lineId: string;
  createdAt: string;
  updatedAt: string;
};

export default function EventLinePayeesPage() {
  // 驗票人員看不到團隊/常用資訊設定，導回活動列表
  const { ready: isTeamAdminReady } = useRequireTeamAdmin();
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const [linePayees, setLinePayees] = useState<LinePayee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formLineId, setFormLineId] = useState("");

  const fetchLinePayees = useCallback(async () => {
    if (teamId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/line-payees`, { credentials: "include" });
      if (!res.ok) {
        setLinePayees([]);
        return;
      }
      const data = await res.json();
      setLinePayees(data.linePayees ?? []);
    } catch {
      setLinePayees([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLinePayees();
  }, [fetchLinePayees]);

  const openDrawer = () => {
    setEditingId(null);
    setSubmitError(null);
    setFormLabel("");
    setFormLineId("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (payee: LinePayee) => {
    setEditingId(payee.id);
    setSubmitError(null);
    setFormLabel(payee.label);
    setFormLineId(payee.lineId);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setSubmitError(null);
    const label = formLabel.trim();
    if (!label) {
      setSubmitError("請輸入名稱／備註");
      return;
    }
    const lineIdError = validateLineIdInput(formLineId);
    if (lineIdError) {
      setSubmitError(lineIdError);
      return;
    }

    const isEditing = editingId !== null;
    const url = isEditing
      ? `/api/teams/${teamId}/line-payees/${editingId}`
      : `/api/teams/${teamId}/line-payees`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label, lineId: formLineId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || (isEditing ? "更新失敗" : "新增失敗"));
        return;
      }
      setDrawerOpen(false);
      fetchLinePayees();
    } catch {
      setSubmitError(isEditing ? "更新失敗" : "新增失敗");
    }
  };

  // 角色確認為管理員之前不 render 內容，避免驗票人員閃過一眼管理畫面
  if (!isTeamAdminReady) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (teamLoading || (teamId == null && !teamError)) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (teamError || teamId == null) {
    return (
      <div className="p-6">
        <p className="text-red-500">{teamError || "請先建立或加入團隊"}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl px-4 py-5 md:px-8 md:py-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">LINE 付款好友</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          新增
        </Button>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        參加者選擇 Line Pay 付款時要加的 LINE 好友。每個活動可以在「主辦與收款」指定不同的人。
      </p>

      {loading ? (
        <p className="text-gray-500">載入中…</p>
      ) : linePayees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          尚無 LINE 付款好友，點擊「新增」建立
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {linePayees.map((payee) => (
            <li
              key={payee.id}
              onClick={() => openEditDrawer(payee)}
              className="flex items-center gap-3 rounded-lg px-2 py-3.5 cursor-pointer hover:bg-brand/[0.04] transition-colors"
            >
              <SimpleIcon icon={siLine} size={20} className="shrink-0 text-[#06C755]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{payee.label}</p>
                <p className="truncate text-sm text-gray-500">{payee.lineId}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingId ? "Edit LINE Payee" : "New LINE Payee"}
        title={editingId ? "編輯 LINE 付款好友" : "新增 LINE 付款好友"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <LinePayeeFields
            label={formLabel}
            lineId={formLineId}
            onLabelChange={setFormLabel}
            onLineIdChange={setFormLineId}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-primary text-ink hover:bg-brand-hover">
              {editingId ? "更新" : "新增"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
