"use client";

import { useState } from "react";
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
          setError(data.error || "新增失敗");
          setSubmitting(false);
          return;
        }
        onSuccess({ id: data.item?.id, content: trimmedContent });
        setContent("");
        onCancel();
      } catch {
        setError("新增失敗");
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
        <Label htmlFor="notice-content">內容</Label>
        <Input
          id="notice-content"
          placeholder="輸入內容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="submit"
          className="bg-gray-900 text-white hover:bg-gray-800"
          disabled={submitting}
        >
          {submitting ? "新增中…" : "新增"}
        </Button>
      </div>
    </form>
  );
}
