"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Users, Trash2, ChevronLeft, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useCurrentTeam } from "@/hooks/use-current-team";

type TeamMember = {
  userId: number;
  role: "owner" | "member";
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
  role: "owner" | "member";
  createdAt: string;
};

type Team = {
  id: number;
  name: string;
  createdAt: string;
};

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = Number(params?.teamId);
  const { team: currentTeam } = useCurrentTeam();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"owner" | "member" | null>(null);

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
        body: JSON.stringify({ email }),
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
        alert("移除失敗");
        return;
      }
      fetchMembers();
    } catch {
      alert("移除失敗");
    }
  };

  const handleUpdateRole = async (userId: number, newRole: "owner" | "member") => {
    if (!Number.isInteger(teamId)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        alert("更新失敗");
        return;
      }
      fetchMembers();
    } catch {
      alert("更新失敗");
    }
  };

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

  // Get current user ID from session - for now we'll use a workaround
  // In a real app, you'd get this from useSession or similar

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/teams")}
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-sm text-gray-500">
            建立於 {new Date(team.createdAt).toLocaleDateString("zh-TW")}
          </p>
        </div>
        <Button onClick={openDrawer} className="gap-2">
          <Plus className="size-4" />
          邀請成員
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">團隊成員</h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
            尚無成員，點擊「邀請成員」新增
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const canManage = currentUserRole === "owner"; // Only owners can manage members
              const isCurrentUser = member.userId === currentUserId;

              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5295BC]/15 text-sm font-semibold text-[#5295BC]">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {member.role === "owner" ? "擁有者" : "成員"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  {canManage && !isCurrentUser && (
                    <div className="flex items-center gap-2">
                      {member.role === "member" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateRole(member.userId, "owner")}
                        >
                          設為擁有者
                        </Button>
                      )}
                      {member.role === "owner" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateRole(member.userId, "member")}
                        >
                          設為成員
                        </Button>
                      )}
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
        <div className="space-y-3 mt-6">
          <h2 className="text-lg font-semibold text-gray-900">待處理邀請</h2>
          <ul className="space-y-2">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4"
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
              請輸入已註冊使用者的 email 來邀請加入團隊
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
              邀請
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
