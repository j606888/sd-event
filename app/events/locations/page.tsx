"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useCurrentTeam } from "@/hooks/use-current-team";

type Location = {
  id: number;
  teamId: number;
  name: string;
  googleMapUrl: string | null;
  address: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function EventLocationsPage() {
  const { teamId, loading: teamLoading, error: teamError } = useCurrentTeam();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formGoogleMap, setFormGoogleMap] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRemark, setFormRemark] = useState("");

  const fetchLocations = useCallback(async () => {
    if (teamId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/locations`, { credentials: "include" });
      if (!res.ok) {
        setLocations([]);
        return;
      }
      const data = await res.json();
      setLocations(data.locations ?? []);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openDrawer = () => {
    setEditingLocationId(null);
    setSubmitError(null);
    setFormName("");
    setFormGoogleMap("");
    setFormAddress("");
    setFormRemark("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (location: Location) => {
    setEditingLocationId(location.id);
    setSubmitError(null);
    setFormName(location.name);
    setFormGoogleMap(location.googleMapUrl || "");
    setFormAddress(location.address || "");
    setFormRemark(location.remark || "");
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

    const isEditing = editingLocationId !== null;
    const url = isEditing
      ? `/api/teams/${teamId}/locations/${editingLocationId}`
      : `/api/teams/${teamId}/locations`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          googleMapUrl: formGoogleMap.trim() || undefined,
          address: formAddress.trim() || undefined,
          remark: formRemark.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || (isEditing ? "更新失敗" : "新增失敗"));
        return;
      }
      setDrawerOpen(false);
      fetchLocations();
    } catch {
      setSubmitError(isEditing ? "更新失敗" : "新增失敗");
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
        <h1 className="text-2xl font-bold text-gray-900">活動地點</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          新增地點
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">載入中…</p>
      ) : locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無活動地點，點擊「新增地點」建立
        </div>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              onClick={() => openEditDrawer(loc)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <MapPin className="size-5 shrink-0 text-[#5295BC]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{loc.name}</p>
                {loc.address && (
                  <p className="text-sm text-gray-500">{loc.address}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle={editingLocationId ? "Edit Location" : "New Location"}
        title={editingLocationId ? "編輯活動地點" : "新增活動地點"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-name">名稱 *</Label>
            <Input
              id="loc-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="輸入名稱"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-map">Google Map *</Label>
            <Input
              id="loc-map"
              value={formGoogleMap}
              onChange={(e) => setFormGoogleMap(e.target.value)}
              placeholder="輸入 Google Map"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-address">地址 *</Label>
            <Input
              id="loc-address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="輸入地址"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-remark">備註</Label>
            <Input
              id="loc-remark"
              value={formRemark}
              onChange={(e) => setFormRemark(e.target.value)}
              placeholder="輸入備註"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
              {editingLocationId ? "更新" : "新增"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
