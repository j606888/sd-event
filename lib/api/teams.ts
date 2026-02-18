// lib/api/teams.ts
export async function getTeams() {
  const res = await fetch("/api/teams", { credentials: "include" });
  if (!res.ok) throw new Error("無法載入團隊");
  const data = await res.json();
  return data.teams ?? [];
}

export async function getActiveTeamId() {
  const res = await fetch("/api/user/active-team", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.activeTeamId ?? null;
}

export async function updateActiveTeam(teamId: number) {
  await fetch("/api/user/active-team", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ teamId }),
  });
}