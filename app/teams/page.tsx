"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";

type Team = {
  id: number;
  name: string;
  createdAt: string;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams", { credentials: "include" });
      if (res.status === 401) {
        setTeams([]);
        return;
      }
      if (!res.ok) {
        setTeams([]);
        return;
      }
      const data = await res.json();
      setTeams(data.teams ?? []);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const openDrawer = () => {
    setSubmitError(null);
    setFormName("");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const name = formName.trim();
    if (!name) {
      setSubmitError("請輸入團隊名稱");
      return;
    }
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "建立失敗");
        return;
      }
      setDrawerOpen(false);
      fetchTeams();
    } catch {
      setSubmitError("建立失敗");
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">團隊管理</h1>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          建立新團隊
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">載入中…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
          尚無團隊，點擊「建立新團隊」建立
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5295BC]/15 text-sm font-semibold text-[#5295BC]">
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{team.name}</p>
                <p className="text-sm text-gray-500">
                  建立於 {new Date(team.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle="New Team"
        title="建立新團隊"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-name">團隊名稱 *</Label>
            <Input
              id="team-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="輸入團隊名稱"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
              建立
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
