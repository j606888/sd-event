"use client";

import { useState, useEffect } from "react";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { team } = useCurrentTeam();

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      // On desktop (lg+), sidebar is always visible via CSS, but we keep state for mobile
      if (window.innerWidth >= 1024) {
        // On desktop, sidebar is always visible via CSS (lg:static, lg:translate-x-0)
        // State doesn't matter for desktop, but we keep it true for consistency
        // setSidebarOpen(true);
      }
      // On mobile/tablet, sidebar starts closed
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex relative">
      {/* Sidebar: Always visible on desktop (lg+), drawer on mobile/tablet */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} team={team} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} team={team} />
        <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      </div>
    </div>
  );
}
