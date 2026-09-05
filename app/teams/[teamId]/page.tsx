"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import {
  ASSIGNABLE_TEAM_ROLES,
  TEAM_ROLE_DESCRIPTION,
  TEAM_ROLE_LABEL,
  isTeamAdmin,
  type AssignableTeamRole,
  type TeamRole,
} from "@/lib/team-roles";

type TeamMember = {
  userId: number;
  role: TeamRole;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

type TeamInvitation = {
  id: number;
  email: string;
  role: TeamRole;
  createdAt: string;
};

type Team = {
  id: number;
  name: string;
  createdAt: string;
};

export default function TeamDetailPage() {
  // 驗票人員看不到團隊/常用資訊設定，導回活動列表
  const { ready: isTeamAdminReady } = useRequireTeamAdmin();
  const params = useParams();
  const router = useRouter();
  const teamId = Number(params?.teamId);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AssignableTeamRole>("member");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!Number.isInteger(teamId)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { credentials: "include" });
      if (!res.ok) {
        router.push("/teams");
        return;
      }
      const data = await res.json();
      setTeam(data.team);
    } catch {
      router.push("/teams");
    }
  }, [teamId, router]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user?.id ?? null);
      }
    } catch {
      // Ignore error
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!Number.isInteger(teamId)) return;
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/members`, { credentials: "include" }),
        fetch(`/api/teams/${teamId}/invitations`, { credentials: "include" }),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const membersList = membersData.members ?? [];
        setMembers(membersList);

        // Find current user's role
        if (currentUserId) {
          const currentMember = membersList.find((m: TeamMember) => m.userId === currentUserId);
          setCurrentUserRole(currentMember?.role ?? null);
        }
      } else {
        setMembers([]);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.invitations ?? []);
      } else {
        setInvitations([]);
      }
    } catch {
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, currentUserId]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (currentUserId) {
      fetchMembers();
    }
  }, [currentUserId, fetchMembers]);

  const openDrawer = () => {
    setSubmitError(null);
    setFormEmail("");
    setFormRole("member");
    setDrawerOpen(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(teamId)) return;
    setSubmitError(null);
    const email = formEmail.trim().toLowerCase();
    if (!email) {
      setSubmitError("請輸入 email");
      return;
    }
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: formRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "邀請失敗");
        return;
      }
      setDrawerOpen(false);
      setFormEmail("");
      fetchMembers();
    } catch {
      setSubmitError("邀請失敗");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!Number.isInteger(teamId)) return;
    if (!confirm("確定要移除此成員嗎？")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "移除失敗");
        return;
      }
      fetchMembers();
    } catch {
      alert("移除失敗");
    }
  };

  const handleUpdateRole = async (userId: number, newRole: AssignableTeamRole) => {
    if (!Number.isInteger(teamId)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "更新失敗");
        return;
      }
      fetchMembers();
    } catch {
      alert("更新失敗");
    }
  };

  // 角色確認為管理員之前不 render 內容，避免驗票人員閃過一眼管理畫面
  if (!isTeamAdminReady) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (loading && members.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <p className="text-red-500">找不到團隊</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl px-4 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{team.name}</h1>
          <p className="text-sm text-gray-500">
            建立於 {new Date(team.createdAt).toLocaleDateString("zh-TW")}
          </p>
        </div>
        {isTeamAdmin(currentUserRole) && (
          <Button onClick={openDrawer} className="gap-2">
            <Plus className="size-4" />
            邀請成員
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="border-b border-hairline pb-2 text-xs font-bold tracking-[0.15em] text-gray-400">團隊成員</h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
            尚無成員，點擊「邀請成員」新增
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {members.map((member) => {
              // 管理員都能管成員；但擁有者這一列誰都不能動（避免團隊被鎖死）
              const canManage = isTeamAdmin(currentUserRole);
              const isCurrentUser = member.userId === currentUserId;
              const isOwnerRow = member.role === "owner";

              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 px-2 py-3.5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.role === "staff"
                            ? "bg-follower/15 text-follower"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {TEAM_ROLE_LABEL[member.role]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  {canManage && !isCurrentUser && !isOwnerRow && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateRole(
                            member.userId,
                            member.role === "staff" ? "member" : "staff"
                          )
                        }
                      >
                        {member.role === "staff" ? "設為管理員" : "設為驗票人員"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="space-y-2 mt-8">
          <h2 className="border-b border-hairline pb-2 text-xs font-bold tracking-[0.15em] text-gray-400">待處理邀請</h2>
          <ul className="divide-y divide-hairline">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center gap-3 px-2 py-3.5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex items-center gap-1">
                      <Clock className="size-3" />
                      待註冊
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {TEAM_ROLE_LABEL[invitation.role]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    邀請於 {new Date(invitation.createdAt).toLocaleDateString("zh-TW")} 送出
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle="Invite Member"
        title="邀請成員"
      >
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-email">Email *</Label>
            <Input
              id="member-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="輸入成員 email"
            />
            <p className="text-xs text-gray-500">
              已註冊的使用者會直接加入團隊；未註冊的會建立邀請，註冊後自動入隊
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>權限</Label>
            <div className="flex flex-col gap-2">
              {ASSIGNABLE_TEAM_ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    formRole === role
                      ? "border-brand bg-brand/5"
                      : "border-hairline hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="member-role"
                    className="mt-1 accent-brand"
                    checked={formRole === role}
                    onChange={() => setFormRole(role)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">
                      {TEAM_ROLE_LABEL[role]}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {TEAM_ROLE_DESCRIPTION[role]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-primary text-white hover:bg-brand-hover">
              邀請
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
