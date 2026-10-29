"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { lineIdInputError } from "@/lib/line";
import { LinePayeeFields } from "./LinePayeeFields";

type LinePayeeDrawerProps = {
  teamId: number;
  onSuccess: (linePayeeId: number) => void;
  onCancel: () => void;
};

export function LinePayeeDrawer({
  teamId,
  onSuccess,
  onCancel,
}: LinePayeeDrawerProps) {
  const t = useTranslations("savedInfo");
  const tCommon = useTranslations("common");
  const [label, setLabel] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError(t("linePayee.labelRequired"));
      return;
    }
    const lineIdError = lineIdInputError(lineId);
    if (lineIdError) {
      setError(t(`linePayee.lineIdErrors.${lineIdError}`));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/line-payees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: trimmedLabel, lineId: lineId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("addFailed"));
        setSubmitting(false);
        return;
      }
      if (data.linePayee?.id) {
        onSuccess(data.linePayee.id);
      }
      setLabel("");
      setLineId("");
      onCancel();
    } catch {
      setError(t("addFailed"));
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <LinePayeeFields
        label={label}
        lineId={lineId}
        onLabelChange={setLabel}
        onLineIdChange={setLineId}
      />
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
