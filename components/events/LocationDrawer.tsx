"use client";

import { useState } from "react";
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
      setError("請輸入名稱");
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
        setError(data.error || "新增失敗");
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
      setError("新增失敗");
    }
    setSubmitting(false);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-name">名稱 *</Label>
        <Input
          id="loc-name"
          placeholder="輸入名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-map">Google Map</Label>
        <Input
          id="loc-map"
          placeholder="輸入 Google Map 連結"
          value={googleMapUrl}
          onChange={(e) => setGoogleMapUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-address">地址</Label>
        <Input
          id="loc-address"
          placeholder="輸入地址"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="loc-remark">備註</Label>
        <Input
          id="loc-remark"
          placeholder="輸入備註"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
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
