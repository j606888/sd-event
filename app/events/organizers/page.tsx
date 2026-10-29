"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { UploadDropzone } from "@/lib/uploadthing";
import { DeleteSavedInfoDrawer } from "@/components/events/management/DeleteSavedInfoDrawer";
import {
  SavedInfoRowActions,
  SavedInfoUsageBadge,
} from "@/components/events/management/SavedInfoRowActions";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { isRenderableImageSrc } from "@/lib/utils";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import type { UsingEvent } from "@/lib/saved-info";

type Organizer = {
  id: number;
  teamId: number;
  name: string;
  photoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  createdAt: string;
  updatedAt: string;
  usedBy: UsingEvent<string>[];
};

export default function EventOrganizersPage() {
  // 驗票人員看不到團隊/常用資訊設定，導回活動列表
  const { ready: isTeamAdminReady } = useRequireTeamAdmin();
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const { teamId, isLoading: teamLoading, error: teamError } = useCurrentTeam();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOrganizerId, setEditingOrganizerId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formInstagram, setFormInstagram] = useState("");
  const [formFacebook, setFormFacebook] = useState("");
  const [deleting, setDeleting] = useState<Organizer | null>(null);

  const fetchOrganizers = useCallback(async () => {
    if (teamId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/organizers`, { credentials: "include" });
      if (!res.ok) {
        setOrganizers([]);
        return;
      }
      const data = await res.json();
      setOrganizers(data.organizers ?? []);
    } catch {
      setOrganizers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  const openDrawer = () => {
    setEditingOrganizerId(null);
    setSubmitError(null);
    setFormPhotoUrl(null);
    setFormName("");
    setFormInstagram("");
    setFormFacebook("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (organizer: Organizer) => {
    setEditingOrganizerId(organizer.id);
    setSubmitError(null);
    setFormPhotoUrl(organizer.photoUrl);
    setFormName(organizer.name);
    setFormInstagram(organizer.instagram || "");
    setFormFacebook(organizer.facebook || "");
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

    const isEditing = editingOrganizerId !== null;
    const url = isEditing
      ? `/api/teams/${teamId}/organizers/${editingOrganizerId}`
      : `/api/teams/${teamId}/organizers`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          photoUrl: formPhotoUrl || undefined,
          instagram: formInstagram.trim() || undefined,
          facebook: formFacebook.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || (isEditing ? t("updateFailed") : t("addFailed")));
        return;
      }
      setDrawerOpen(false);
      fetchOrganizers();
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
        <h1 className="font-display text-2xl font-bold text-ink">{t("organizer.title")}</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          <span>{t("organizer.add")}</span>
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">{tCommon("loading")}</p>
      ) : organizers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {t("organizer.empty")}
        </div>
      ) : (
        <ul className="surface-card overflow-hidden divide-y divide-hairline">
          {organizers.map((org) => (
            <li
              key={org.id}
              onClick={() => openEditDrawer(org)}
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-paper transition-colors"
            >
              {isRenderableImageSrc(org.photoUrl) ? (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  <Image
                    src={org.photoUrl}
                    alt={org.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <Building2 className="size-5 shrink-0 text-brand-strong" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{org.name}</p>
                {(org.instagram || org.facebook) && (
                  <p className="truncate text-sm text-gray-500">
                    {[org.instagram, org.facebook].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <SavedInfoUsageBadge count={org.usedBy.length} />
              <SavedInfoRowActions
                name={org.name}
                onEdit={() => openEditDrawer(org)}
                onDelete={() => setDeleting(org)}
              />
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingOrganizerId ? "Edit Organizer" : "New Organizer"}
        title={editingOrganizerId ? t("organizer.editTitle") : t("organizer.newTitle")}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label>{t("organizer.photoLabel")}</Label>
            {isRenderableImageSrc(formPhotoUrl) ? (
              <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={formPhotoUrl}
                    alt={t("organizer.photoAlt")}
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormPhotoUrl(null)}
                  className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                  aria-label={t("organizer.removePhoto")}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone
                endpoint="organizerPhoto"
                config={{ mode: "auto" }}
                onClientUploadComplete={(res) => {
                  const first = res?.[0];
                  const url =
                    first &&
                    ("url" in first
                      ? first.url
                      : (first as { ufsUrl?: string }).ufsUrl);
                  if (url) setFormPhotoUrl(url);
                }}
                onUploadError={(err) => {
                  console.error(err);
                  setSubmitError(t("organizer.uploadFailed"));
                }}
                appearance={{
                  container:
                    "rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8",
                  label: "text-gray-500",
                  button:
                    "bg-brand text-ink rounded-md px-4 py-2 text-sm font-medium after:bg-brand-hover",
                }}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">{t("nameLabel")}</Label>
            <Input
              id="org-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-ig">Instagram</Label>
            <Input
              id="org-ig"
              value={formInstagram}
              onChange={(e) => setFormInstagram(e.target.value)}
              placeholder={t("organizer.instagramPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-fb">Facebook</Label>
            <Input
              id="org-fb"
              value={formFacebook}
              onChange={(e) => setFormFacebook(e.target.value)}
              placeholder={t("organizer.facebookPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="bg-primary text-ink hover:bg-brand-hover">
              {editingOrganizerId ? t("update") : tCommon("add")}
            </Button>
          </div>
        </form>
      </Drawer>

      {deleting && (
        <DeleteSavedInfoDrawer
          open
          onClose={() => setDeleting(null)}
          kind="organizer"
          name={deleting.name}
          usedBy={deleting.usedBy}
          deleteUrl={`/api/teams/${teamId}/organizers/${deleting.id}`}
          onDeleted={fetchOrganizers}
        />
      )}
    </div>
  );
}
