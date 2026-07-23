"use client";

import { useState } from "react";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ImpersonationBanner } from "./ImpersonationBanner";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { team, teams, refetch: refetchTeams, changeTeam } = useCurrentTeam();

  return (
    <div className="flex flex-col min-h-dvh">
      <ImpersonationBanner />
      <div className="flex relative flex-1 min-h-0">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          team={team}
          teams={teams}
          onTeamChange={refetchTeams}
          changeTeam={changeTeam}
        />

        <div className="flex-1 flex flex-col min-w-0 lg:ml-[280px]">
          <Header onMenuClick={() => setSidebarOpen(true)} team={team} />
          <main className="flex-1 flex flex-col overflow-auto bg-surface">{children}</main>
        </div>
      </div>
    </div>
  );
}
