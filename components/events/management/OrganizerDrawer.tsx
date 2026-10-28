"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizerDrawerProps = {
  teamId: number;
  onSuccess: (organizerId: number) => void;
  onCancel: () => void;
};

export function OrganizerDrawer({
  teamId,
  onSuccess,
  onCancel,
}: OrganizerDrawerProps) {
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("nameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/organizers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          photoUrl: photoUrl.trim() || undefined,
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("addFailed"));
        setSubmitting(false);
        return;
      }
      if (data.organizer?.id) {
        onSuccess(data.organizer.id);
      }
      setName("");
      setPhotoUrl("");
      setInstagram("");
      setFacebook("");
      onCancel();
    } catch {
      setError(t("addFailed"));
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-photo">{t("organizer.photoUrlLabel")}</Label>
        <Input
          id="org-photo"
          placeholder={t("organizer.photoUrlPlaceholder")}
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">{t("nameLabel")}</Label>
        <Input
          id="org-name"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-ig">Instagram</Label>
        <Input
          id="org-ig"
          placeholder={t("organizer.instagramPlaceholder")}
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-fb">Facebook</Label>
        <Input
          id="org-fb"
          placeholder={t("organizer.facebookPlaceholder")}
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button
          type="submit"
          className="bg-primary text-ink hover:bg-brand-hover"
          disabled={submitting}
        >
          {submitting ? tCommon("adding") : tCommon("add")}
        </Button>
      </div>
    </form>
  );
}
