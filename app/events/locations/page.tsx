"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { DeleteSavedInfoDrawer } from "@/components/events/management/DeleteSavedInfoDrawer";
import {
  SavedInfoRowActions,
  SavedInfoUsageBadge,
} from "@/components/events/management/SavedInfoRowActions";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import type { UsingEvent } from "@/lib/saved-info";

type Location = {
  id: number;
  teamId: number;
  name: string;
  googleMapUrl: string | null;
  address: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  usedBy: UsingEvent<string>[];
};

export default function EventLocationsPage() {
  // 驗票人員看不到團隊/常用資訊設定，導回活動列表
  const { ready: isTeamAdminReady } = useRequireTeamAdmin();
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formGoogleMap, setFormGoogleMap] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRemark, setFormRemark] = useState("");
  const [deleting, setDeleting] = useState<Location | null>(null);

  const fetchLocations = useCallback(async () => {
    if (teamId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/locations`, { credentials: "include" });
      if (!res.ok) {
        setLocations([]);
        return;
      }
      const data = await res.json();
      setLocations(data.locations ?? []);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openDrawer = () => {
    setEditingLocationId(null);
    setSubmitError(null);
    setFormName("");
    setFormGoogleMap("");
    setFormAddress("");
    setFormRemark("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (location: Location) => {
    setEditingLocationId(location.id);
    setSubmitError(null);
    setFormName(location.name);
    setFormGoogleMap(location.googleMapUrl || "");
    setFormAddress(location.address || "");
    setFormRemark(location.remark || "");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setSubmitError(null);
    const name = formName.trim();
    if (!name) {
      setSubmitError(t("nameRequired"));
      return;
    }

    const isEditing = editingLocationId !== null;
    const url = isEditing
      ? `/api/teams/${teamId}/locations/${editingLocationId}`
      : `/api/teams/${teamId}/locations`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          googleMapUrl: formGoogleMap.trim() || undefined,
          address: formAddress.trim() || undefined,
          remark: formRemark.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || (isEditing ? t("updateFailed") : t("addFailed")));
        return;
      }
      setDrawerOpen(false);
      fetchLocations();
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">{t("location.title")}</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          <span>{t("location.add")}</span>
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">{tCommon("loading")}</p>
      ) : locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {t("location.empty")}
        </div>
      ) : (
        <ul className="surface-card overflow-hidden divide-y divide-hairline">
          {locations.map((loc) => (
            <li
              key={loc.id}
              onClick={() => openEditDrawer(loc)}
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-paper transition-colors"
            >
              <MapPin className="size-5 shrink-0 text-brand-strong" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{loc.name}</p>
                {loc.address && (
                  <p className="text-sm text-gray-500">{loc.address}</p>
                )}
              </div>
              <SavedInfoUsageBadge count={loc.usedBy.length} />
              <SavedInfoRowActions
                name={loc.name}
                onEdit={() => openEditDrawer(loc)}
                onDelete={() => setDeleting(loc)}
              />
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingLocationId ? "Edit Location" : "New Location"}
        title={editingLocationId ? t("location.editTitle") : t("location.newTitle")}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-name">{t("nameLabel")}</Label>
            <Input
              id="loc-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-map">Google Map *</Label>
            <Input
              id="loc-map"
              value={formGoogleMap}
              onChange={(e) => setFormGoogleMap(e.target.value)}
              placeholder={t("location.googleMapPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-address">{t("location.addressLabelRequired")}</Label>
            <Input
              id="loc-address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder={t("location.addressPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-remark">{t("location.remarkLabel")}</Label>
            <Input
              id="loc-remark"
              value={formRemark}
              onChange={(e) => setFormRemark(e.target.value)}
              placeholder={t("location.remarkPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="bg-primary text-ink hover:bg-brand-hover">
              {editingLocationId ? t("update") : tCommon("add")}
            </Button>
          </div>
        </form>
      </Drawer>

      {deleting && (
        <DeleteSavedInfoDrawer
          open
          onClose={() => setDeleting(null)}
          kind="location"
          name={deleting.name}
          usedBy={deleting.usedBy}
          deleteUrl={`/api/teams/${teamId}/locations/${deleting.id}`}
          onDeleted={fetchLocations}
        />
      )}
    </div>
  );
}
