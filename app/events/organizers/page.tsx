"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useCurrentTeam } from "@/hooks/use-current-team";

type Organizer = {
  id: number;
  teamId: number;
  name: string;
  photoUrl: string | null;
  lineId: string | null;
  instagram: string | null;
  facebook: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function EventOrganizersPage() {
  const { teamId, loading: teamLoading, error: teamError } = useCurrentTeam();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLineId, setFormLineId] = useState("");
  const [formInstagram, setFormInstagram] = useState("");
  const [formFacebook, setFormFacebook] = useState("");

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
    setSubmitError(null);
    setFormName("");
    setFormLineId("");
    setFormInstagram("");
    setFormFacebook("");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId == null) return;
    setSubmitError(null);
    const name = formName.trim();
    if (!name) {
      setSubmitError("請輸入名稱");
      return;
    }
    try {
      const res = await fetch(`/api/teams/${teamId}/organizers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          lineId: formLineId.trim() || undefined,
          instagram: formInstagram.trim() || undefined,
          facebook: formFacebook.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "新增失敗");
        return;
      }
      setDrawerOpen(false);
      fetchOrganizers();
    } catch {
      setSubmitError("新增失敗");
    }
  };

  if (teamLoading || (teamId == null && !teamError)) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (teamError || teamId == null) {
    return (
      <div className="p-6">
        <p className="text-red-500">{teamError || "請先建立或加入團隊"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">主辦單位</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          新增主辦單位
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">載入中…</p>
      ) : organizers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無主辦單位，點擊「新增主辦單位」建立
        </div>
      ) : (
        <ul className="space-y-2">
          {organizers.map((org) => (
            <li
              key={org.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <Building2 className="size-5 shrink-0 text-[#5295BC]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{org.name}</p>
                {(org.lineId || org.instagram || org.facebook) && (
                  <p className="text-sm text-gray-500">
                    {[org.lineId, org.instagram, org.facebook].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle="New Organizer"
        title="新增主辦單位"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label>主辦方照片</Label>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8">
              <CloudUpload className="size-8 text-gray-400" />
              <span className="text-sm text-gray-500">上傳照片</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">名稱 *</Label>
            <Input
              id="org-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="輸入名稱"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-line">Line ID</Label>
            <Input
              id="org-line"
              value={formLineId}
              onChange={(e) => setFormLineId(e.target.value)}
              placeholder="輸入 Line ID"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-ig">Instagram</Label>
            <Input
              id="org-ig"
              value={formInstagram}
              onChange={(e) => setFormInstagram(e.target.value)}
              placeholder="輸入 Instagram"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-fb">Facebook</Label>
            <Input
              id="org-fb"
              value={formFacebook}
              onChange={(e) => setFormFacebook(e.target.value)}
              placeholder="輸入 Facebook"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
              新增
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
