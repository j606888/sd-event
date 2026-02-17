"use client";

import { useState } from "react";
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
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [lineId, setLineId] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("請輸入名稱");
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
          lineId: lineId.trim() || undefined,
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "新增失敗");
        setSubmitting(false);
        return;
      }
      if (data.organizer?.id) {
        onSuccess(data.organizer.id);
      }
      setName("");
      setPhotoUrl("");
      setLineId("");
      setInstagram("");
      setFacebook("");
      onCancel();
    } catch {
      setError("新增失敗");
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-photo">主辦方照片網址（選填）</Label>
        <Input
          id="org-photo"
          placeholder="圖片網址"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">名稱 *</Label>
        <Input
          id="org-name"
          placeholder="輸入名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-line">Line ID</Label>
        <Input
          id="org-line"
          placeholder="輸入 Line ID"
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-ig">Instagram</Label>
        <Input
          id="org-ig"
          placeholder="輸入 Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-fb">Facebook</Label>
        <Input
          id="org-fb"
          placeholder="輸入 Facebook"
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
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
