"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { siLine } from "simple-icons";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { LinePayeeFields } from "@/components/events/management/LinePayeeFields";
import { DeleteSavedInfoDrawer } from "@/components/events/management/DeleteSavedInfoDrawer";
import {
  SavedInfoRowActions,
  SavedInfoUsageBadge,
} from "@/components/events/management/SavedInfoRowActions";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import { lineIdInputError } from "@/lib/line";
import type { UsingEvent } from "@/lib/saved-info";

type LinePayee = {
  id: number;
  teamId: number;
  label: string;
  lineId: string;
  createdAt: string;
  updatedAt: string;
  usedBy: UsingEvent<string>[];
};

export default function EventLinePayeesPage() {
  // 驗票人員看不到團隊/常用資訊設定，導回活動列表
  const { ready: isTeamAdminReady } = useRequireTeamAdmin();
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const [linePayees, setLinePayees] = useState<LinePayee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formLineId, setFormLineId] = useState("");
  const [deleting, setDeleting] = useState<LinePayee | null>(null);

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
      setSubmitError(t("linePayee.labelRequired"));
      return;
    }
    const lineIdError = lineIdInputError(formLineId);
    if (lineIdError) {
      setSubmitError(t(`linePayee.lineIdErrors.${lineIdError}`));
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
        setSubmitError(data.error || (isEditing ? t("updateFailed") : t("addFailed")));
        return;
      }
      setDrawerOpen(false);
      fetchLinePayees();
    } catch {
      setSubmitError(isEditing ? t("updateFailed") : t("addFailed"));
    }
  };

  // 角色確認為管理員之前不 render 內容，避免驗票人員閃過一眼管理畫面
  if (!isTeamAdminReady) {
    return (
      <div className="p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (teamLoading || (teamId == null && !teamError)) {
    return (
      <div className="p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (teamError || teamId == null) {
    return (
      <div className="p-6">
        <p className="text-red-500">{teamError || t("noTeam")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl px-4 py-5 md:px-8 md:py-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">{t("linePayee.title")}</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          <span>{tCommon("add")}</span>
        </Button>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {t("linePayee.intro")}
      </p>

      {loading ? (
        <p className="text-gray-500">{tCommon("loading")}</p>
      ) : linePayees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {t("linePayee.empty")}
        </div>
      ) : (
        <ul className="surface-card overflow-hidden divide-y divide-hairline">
          {linePayees.map((payee) => (
            <li
              key={payee.id}
              onClick={() => openEditDrawer(payee)}
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-paper transition-colors"
            >
              <SimpleIcon icon={siLine} size={20} className="shrink-0 text-[#06C755]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{payee.label}</p>
                <p className="truncate text-sm text-gray-500">{payee.lineId}</p>
              </div>
              <SavedInfoUsageBadge count={payee.usedBy.length} />
              <SavedInfoRowActions
                name={payee.label}
                onEdit={() => openEditDrawer(payee)}
                onDelete={() => setDeleting(payee)}
              />
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingId ? "Edit LINE Payee" : "New LINE Payee"}
        title={editingId ? t("linePayee.editTitle") : t("linePayee.newTitle")}
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
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="bg-primary text-ink hover:bg-brand-hover">
              {editingId ? t("update") : tCommon("add")}
            </Button>
          </div>
        </form>
      </Drawer>

      {deleting && (
        <DeleteSavedInfoDrawer
          open
          onClose={() => setDeleting(null)}
          kind="linePayee"
          name={deleting.label}
          usedBy={deleting.usedBy}
          deleteUrl={`/api/teams/${teamId}/line-payees/${deleting.id}`}
          onDeleted={fetchLinePayees}
        />
      )}
    </div>
  );
}
