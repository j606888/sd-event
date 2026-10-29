"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NoticeItemDraft = { id?: number; content: string };

type NoticeItemDrawerProps = {
  mode: "create" | "edit";
  eventId?: number;
  currentItems: NoticeItemDraft[];
  onSuccess: (item: NoticeItemDraft) => void;
  onCancel: () => void;
};

export function NoticeItemDrawer({
  mode,
  eventId,
  currentItems,
  onSuccess,
  onCancel,
}: NoticeItemDrawerProps) {
  const t = useTranslations("eventForm.notice");
  const tCommon = useTranslations("common");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedContent = content.trim();
    if (mode === "edit" && eventId != null) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/events/${eventId}/notice-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: trimmedContent,
            sortOrder: currentItems.length,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || t("addFailed"));
          setSubmitting(false);
          return;
        }
        onSuccess({ id: data.item?.id, content: trimmedContent });
        setContent("");
        onCancel();
      } catch {
        setError(t("addFailed"));
      }
      setSubmitting(false);
    } else {
      onSuccess({ content: trimmedContent });
      setContent("");
      onCancel();
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-content">{t("contentLabel")}</Label>
        <Input
          id="notice-content"
          placeholder={t("contentPlaceholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
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
