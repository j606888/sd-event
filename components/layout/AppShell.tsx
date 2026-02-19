"use client";

import { useState } from "react";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { team, teams, refetch: refetchTeams, changeTeam } = useCurrentTeam();

  return (
    <div className="flex relative">
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        team={team}
        teams={teams}
        onTeamChange={refetchTeams}
        changeTeam={changeTeam}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} team={team} />
        <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      </div>
    </div>
  );
}
