"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateLineIdInput } from "@/lib/line";
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
  const [label, setLabel] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("請輸入名稱／備註");
      return;
    }
    const lineIdError = validateLineIdInput(lineId);
    if (lineIdError) {
      setError(lineIdError);
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
        setError(data.error || "新增失敗");
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
      setError("新增失敗");
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
          取消
        </Button>
        <Button
          type="submit"
          className="bg-primary text-white hover:bg-brand-hover"
          disabled={submitting}
        >
          {submitting ? "新增中…" : "新增"}
        </Button>
      </div>
    </form>
  );
}
