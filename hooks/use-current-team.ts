"use client";

import { useEffect, useState } from "react";

export type Team = { id: number; name: string; createdAt: string };

export function useCurrentTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", { credentials: "include" });
      if (!res.ok) {
        setError("無法載入團隊");
        setTeams([]);
        return;
      }
      const data = await res.json();
      setTeams(data.teams ?? []);
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

  const team = teams[0] ?? null;
  const teamId = team?.id ?? null;

  return { teamId, team, teams, loading, error, refetch };
}
