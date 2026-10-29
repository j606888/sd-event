"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationDrawerProps = {
  teamId: number;
  onSuccess: (locationId: number) => void;
  onCancel: () => void;
};

export function LocationDrawer({
  teamId,
  onSuccess,
  onCancel,
}: LocationDrawerProps) {
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [address, setAddress] = useState("");
  const [remark, setRemark] = useState("");
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
      const res = await fetch(`/api/teams/${teamId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          googleMapUrl: googleMapUrl.trim() || undefined,
          address: address.trim() || undefined,
          remark: remark.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("addFailed"));
        setSubmitting(false);
        return;
      }
      if (data.location?.id) {
        onSuccess(data.location.id);
      }
      setName("");
      setGoogleMapUrl("");
      setAddress("");
      setRemark("");
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
        <Label htmlFor="loc-name">{t("nameLabel")}</Label>
        <Input
          id="loc-name"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-map">Google Map</Label>
        <Input
          id="loc-map"
          placeholder={t("location.googleMapLinkPlaceholder")}
          value={googleMapUrl}
          onChange={(e) => setGoogleMapUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-address">{t("location.addressLabel")}</Label>
        <Input
          id="loc-address"
          placeholder={t("location.addressPlaceholder")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-remark">{t("location.remarkLabel")}</Label>
        <Input
          id="loc-remark"
          placeholder={t("location.remarkPlaceholder")}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
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
