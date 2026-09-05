"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  X,
  ChevronsUpDown,
  Plus,
  Calendar,
  Users,
  MapPin,
  Building2,
  Landmark,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useTeamRole } from "@/hooks/use-team-role";
import { TEAM_ROLE_LABEL } from "@/lib/team-roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = { id: number; name: string } | null;

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  team: Team;
  teams: Team[] | null;
  onTeamChange: () => void;
  changeTeam: (teamId: number) => void;
};

export function Sidebar({ open, onClose, team, teams, onTeamChange, changeTeam }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSuperAdmin } = useSession();
  // 驗票人員只需要看到活動列表，其餘管理功能一律不顯示
  const { isAdmin, isStaff } = useTeamRole();
  const [createTeamDrawerOpen, setCreateTeamDrawerOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const teamLabel = team?.name ?? "選擇團隊";
  const teamInitial = team?.name?.charAt(0)?.toUpperCase() ?? "?";
  const currentTeamId = team?.id ? String(team.id) : "";

  const isActive = (href: string) => {
    if (href === "/events") {
      return pathname === "/events" || (pathname.startsWith("/events/") && !pathname.startsWith("/events/locations") && !pathname.startsWith("/events/organizers") && !pathname.startsWith("/events/bank"));
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleTeamChange = (teamId: string) => {
    if (teamId && teamId !== currentTeamId) {
      const teamIdNum = Number(teamId);
      if (!Number.isInteger(teamIdNum)) return;

      changeTeam(teamIdNum);
      router.push(`/teams/${teamId}`);
      router.refresh();
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const name = teamName.trim();
    if (!name) {
      setCreateError("請輸入團隊名稱");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "建立失敗");
        setCreating(false);
        return;
      }
      setCreateTeamDrawerOpen(false);
      setTeamName("");
      onTeamChange();
      if (data.team?.id) {
        changeTeam(data.team.id);
        router.push(`/teams/${data.team.id}`);
        router.refresh();
      }
    } catch {
      setCreateError("建立失敗");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* 1. Backdrop (Mobile 專用) */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-60 bg-black/50 transition-opacity lg:hidden"
        />
      )}

      {/* 2. Sidebar 主體 */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-70 w-[280px] bg-ink transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          flex h-full flex-col
        `}
      >
        {/* Header - 固定高度 */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <span className="font-display text-xl font-bold text-white">
            SD Event<span className="text-follower">.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex lg:hidden size-9 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 捲動區域 */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 scrollbar-thin">
          {/* Team selector */}
          <div className="mb-2">
            <Select value={currentTeamId} onValueChange={handleTeamChange}>
              <SelectTrigger className="w-full bg-white/10 text-white shadow-none h-auto py-3 px-3 cursor-pointer hover:bg-white/15 focus:ring-white/20">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-follower/25 text-sm font-bold text-follower">
                    {teamInitial}
                  </div>
                  <SelectValue className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {teamLabel}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {teams && teams.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">尚無團隊</div>
                ) : (
                  teams && teams.map((t: Team) => {
                    if (!t) return null;
                    const initial = t.name.charAt(0).toUpperCase();
                    const isSelected = String(t.id) === currentTeamId;
                    return (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-brand/15 text-xs font-bold text-brand">
                            {initial}
                          </div>
                          <span className={isSelected ? "font-semibold" : ""}>{t.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setCreateTeamDrawerOpen(true);
                setTeamName("");
                setCreateError(null);
              }}
              className="mb-6 flex items-center gap-2 px-2 text-xs font-semibold text-follower hover:text-follower-hover transition-colors"
            >
              <Plus className="size-3.5" />
              建立新團隊
            </button>
          ) : (
            <div className="mb-6 px-2">
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                {isStaff ? TEAM_ROLE_LABEL.staff : ""}
              </span>
            </div>
          )}

          {/* Nav List */}
          <div className="space-y-6">
            <nav className="flex flex-col gap-1">
              <SidebarLink href="/events" icon={Calendar} label="所有活動" active={isActive("/events")} onClick={onClose} />
              {isAdmin && (
                <SidebarLink href="/teams" icon={Users} label="團隊管理" active={isActive("/teams")} onClick={onClose} />
              )}
            </nav>

            {isAdmin && (
              <div>
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">
                  常用資訊
                </p>
                <nav className="flex flex-col gap-1">
                  <SidebarLink href="/events/locations" icon={MapPin} label="活動地點" active={isActive("/events/locations")} onClick={onClose} />
                  <SidebarLink href="/events/organizers" icon={Building2} label="主辦單位" active={isActive("/events/organizers")} onClick={onClose} />
                  <SidebarLink href="/events/bank" icon={Landmark} label="銀行資訊" active={isActive("/events/bank")} onClick={onClose} />
                </nav>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">
                  站方
                </p>
                <nav className="flex flex-col gap-1">
                  <SidebarLink href="/admin" icon={ShieldCheck} label="總管理" active={isActive("/admin")} onClick={onClose} />
                </nav>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => { onClose(); handleLogout(); }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/50 hover:bg-white/5 hover:text-red-300 transition-colors"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 transition-colors">
                <LogOut className="size-4" />
              </div>
              登出帳號
            </button>
          </div>
        </div>
      </aside>

      {/* Create Team Drawer */}
      <Drawer
        open={createTeamDrawerOpen}
        onClose={() => {
          setCreateTeamDrawerOpen(false);
          setTeamName("");
          setCreateError(null);
        }}
        title="建立新團隊"
        subtitle="New Team"
      >
        <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
          {createError && (
            <p className="text-sm text-red-500">{createError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-name">團隊名稱 *</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="輸入團隊名稱"
              disabled={creating}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setCreateTeamDrawerOpen(false);
                setTeamName("");
                setCreateError(null);
              }}
              disabled={creating}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="bg-primary text-white hover:bg-brand-hover"
              disabled={creating}
            >
              {creating ? "建立中..." : "建立"}
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}

// 抽取 Link 組件減少樣板代碼
function SidebarLink({ href, icon: Icon, label, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-follower" />
      )}
      <Icon className={`size-5 ${active ? "text-follower" : "text-white/40 group-hover:text-white/70"}`} />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}