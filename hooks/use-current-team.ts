"use client";

import { useEffect, useState } from "react";

export type Team = { id: number; name: string; createdAt: string };

export function useCurrentTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teams and active team in parallel
      const [teamsRes, activeTeamRes] = await Promise.all([
        fetch("/api/teams", { credentials: "include" }),
        fetch("/api/user/active-team", { credentials: "include" }),
      ]);

      if (!teamsRes.ok) {
        setError("無法載入團隊");
        setTeams([]);
        return;
      }

      const teamsData = await teamsRes.json();
      const teamsList = teamsData.teams ?? [];
      setTeams(teamsList);

      // Get active team ID
      let currentActiveTeamId: number | null = null;
      if (activeTeamRes.ok) {
        const activeTeamData = await activeTeamRes.json();
        currentActiveTeamId = activeTeamData.activeTeamId ?? null;
      }

      // If no active team is set, set it to the first team
      if (currentActiveTeamId == null && teamsList.length > 0) {
        currentActiveTeamId = teamsList[0].id;
        // Save it to the database
        await fetch("/api/user/active-team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ teamId: currentActiveTeamId }),
        });
      }

      setActiveTeamId(currentActiveTeamId);
    } catch {
      setError("無法載入團隊");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const team = teams.find((t) => t.id === activeTeamId) ?? teams[0] ?? null;
  const teamId = team?.id ?? null;

  return { teamId, team, teams, activeTeamId, loading, error, refetch };
}
