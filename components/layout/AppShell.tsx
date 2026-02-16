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
  const { team } = useCurrentTeam();

  return (
    <div className="min-h-screen">
      <Header onMenuClick={() => setSidebarOpen(true)} team={team} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} team={team} />
      <main className="min-h-[calc(100vh-3.5rem)] flex flex-col">{children}</main>
    </div>
  );
}
