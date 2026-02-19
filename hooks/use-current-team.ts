"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeams, getActiveTeamId, updateActiveTeam } from "@/lib/api/teams";
import { useEffect } from "react";

type Team = { id: number; name: string };

export function useCurrentTeam() {
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const { data: activeTeamId, isLoading: activeLoading } = useQuery({
    queryKey: ["active-team-id"],
    queryFn: getActiveTeamId,
  });

  const { mutate: changeTeam } = useMutation({
    mutationFn: updateActiveTeam,
    onSuccess: (_data, teamId) => {
      queryClient.setQueryData(["active-team-id"], teamId);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  useEffect(() => {
    if (!activeLoading && activeTeamId === null && teams.length > 0) {
      changeTeam(teams[0].id);
    }
  }, [activeLoading, activeTeamId, teams, changeTeam]);

  const team = teams.find((t: Team) => t.id === activeTeamId) ?? teams[0] ?? null;

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["active-team-id"] });
  }
  
  return {
    team,
    teamId: team?.id ?? null,
    teams,
    activeTeamId,
    isLoading: teamsLoading || activeLoading,
    error: teamsError ? "無法載入團隊" : null,
    changeTeam,
    refetch: handleRefetch,
  };
}
