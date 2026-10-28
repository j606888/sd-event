"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Mail, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";
import {
  ASSIGNABLE_TEAM_ROLES,
  isTeamAdmin,
  type AssignableTeamRole,
  type TeamRole,
} from "@/lib/team-roles";
import { formatDate } from "@/lib/format-event-date";

type TeamMember = {
  userId: number;
  role: TeamRole;
  notifyOnRegistration: boolean;
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
  const t = useTranslations("team");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("teamRoles");
  const locale = useLocale();
  // owner 與 member 對使用者都是「管理員」
  const roleLabel = (role: TeamRole) => tRoles(isTeamAdmin(role) ? "admin" : "staff");
  const teamId = Number(params?.teamId);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  // 邀請／重寄後的結果，主要是讓管理員知道信有沒有寄出去
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
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
      setSubmitError(t("inviteForm.emailRequired"));
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: formRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || t("inviteForm.failed"));
        return;
      }
      if (data.member) {
        setNotice(
          data.emailSent
            ? { tone: "success", text: t("notice.memberAdded", { email }) }
            : { tone: "error", text: t("notice.memberAddedEmailFailed", { email }) }
        );
      } else {
        setNotice(
          data.emailSent
            ? { tone: "success", text: t("notice.invited", { email }) }
            : { tone: "error", text: t("notice.invitedEmailFailed") }
        );
      }
      setDrawerOpen(false);
      setFormEmail("");
      fetchMembers();
    } catch {
      setSubmitError(t("inviteForm.failed"));
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitation: TeamInvitation) => {
    if (!Number.isInteger(teamId)) return;
    setResendingId(invitation.id);
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations/${invitation.id}/resend`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setNotice(
        res.ok
          ? { tone: "success", text: t("notice.resent", { email: invitation.email }) }
          : { tone: "error", text: data.error || t("notice.resendFailed") }
      );
    } catch {
      setNotice({ tone: "error", text: t("notice.resendFailed") });
    } finally {
      setResendingId(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!Number.isInteger(teamId)) return;
    if (!confirm(t("members.removeConfirm"))) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t("members.removeFailed"));
        return;
      }
      fetchMembers();
    } catch {
      alert(t("members.removeFailed"));
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
        alert(data.error || t("members.updateFailed"));
        return;
      }
      fetchMembers();
    } catch {
      alert(t("members.updateFailed"));
    }
  };

  const handleToggleNotify = async (userId: number, next: boolean) => {
    if (!Number.isInteger(teamId)) return;
    // 先樂觀更新，失敗再還原
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, notifyOnRegistration: next } : m))
    );
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notifyOnRegistration: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t("members.updateFailed"));
      }
    } catch {
      alert(t("members.updateFailed"));
    }
    fetchMembers();
  };

  // 角色確認為管理員之前不 render 內容，避免驗票人員閃過一眼管理畫面
  if (!isTeamAdminReady) {
    return (
      <div className="p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (loading && members.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <p className="text-red-500">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl px-4 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{team.name}</h1>
          <p className="text-sm text-gray-500">
            {t("createdAt", { date: formatDate(team.createdAt, locale) })}
          </p>
        </div>
        {isTeamAdmin(currentUserRole) && (
          <Button onClick={openDrawer} className="gap-2">
            <Plus className="size-4" />
            <span>{t("invite")}</span>
          </Button>
        )}
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            notice.tone === "success" ? "bg-brand-soft text-brand-strong" : "bg-red-50 text-red-600"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="space-y-2">
        <h2 className="text-xs font-bold tracking-[0.15em] text-muted-ink">{t("members.title")}</h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
            {t("members.empty")}
          </div>
        ) : (
          <ul className="surface-card overflow-hidden divide-y divide-hairline">
            {members.map((member) => {
              // 管理員都能管成員；但擁有者這一列誰都不能動（避免團隊被鎖死）
              const canManage = isTeamAdmin(currentUserRole);
              const isCurrentUser = member.userId === currentUserId;
              const isOwnerRow = member.role === "owner";

              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand-strong">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.role === "staff"
                            ? "bg-butter-soft text-butter-ink"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {roleLabel(member.role)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                    {canManage && isTeamAdmin(member.role) && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={member.notifyOnRegistration}
                        onClick={() =>
                          handleToggleNotify(member.userId, !member.notifyOnRegistration)
                        }
                        className="mt-1.5 inline-flex items-center gap-2 text-xs text-gray-600"
                      >
                        <span
                          className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
                            member.notifyOnRegistration ? "bg-brand" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform ${
                              member.notifyOnRegistration ? "translate-x-3.5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                        <span>{t("members.notifyOnRegistration")}</span>
                      </button>
                    )}
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
                        {member.role === "staff" ? t("members.makeAdmin") : t("members.makeStaff")}
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
          <h2 className="text-xs font-bold tracking-[0.15em] text-muted-ink">{t("invitations.title")}</h2>
          <ul className="surface-card overflow-hidden divide-y divide-hairline">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center gap-3 px-5 py-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{t("invitations.pendingSignup")}</span>
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {roleLabel(invitation.role)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t("invitations.sentAt", { date: formatDate(invitation.createdAt, locale) })}
                  </p>
                </div>
                {isTeamAdmin(currentUserRole) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resendingId === invitation.id}
                    onClick={() => void handleResendInvitation(invitation)}
                    className="shrink-0"
                  >
                    {resendingId === invitation.id ? t("invitations.resending") : t("invitations.resend")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        subtitle="Invite Member"
        title={t("invite")}
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
              placeholder={t("inviteForm.emailPlaceholder")}
            />
            <p className="text-xs text-gray-500">
              {t("inviteForm.emailHint")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("inviteForm.roleLabel")}</Label>
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
                      {roleLabel(role)}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {t(`roleDescription.${role}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={inviting} className="bg-primary text-ink hover:bg-brand-hover">
              {inviting ? t("inviteForm.submitting") : t("inviteForm.submit")}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
