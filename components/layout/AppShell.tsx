"use client";

import { useEffect, useState } from "react";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { loginPath } from "@/lib/safe-next-path";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ImpersonationBanner } from "./ImpersonationBanner";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    team,
    teams,
    refetch: refetchTeams,
    changeTeam,
    isUnauthorized,
  } = useCurrentTeam();

  // 分頁一直開著時 session 才過期的情況。React Query 預設會在切回視窗時
  // refetch，所以放著沒動的分頁一回來就會被踢出去，而不是停在載入中的畫面。
  //
  // 刻意用整頁導向而非 router.replace：這樣 React tree 跟整個 query cache
  // 一起丟掉，不會帶著失效的狀態進登入頁。
  useEffect(() => {
    if (!isUnauthorized) return;
    // 用 window.location 而不是 usePathname()：這裡本來就只在 client 跑，
    // 也順便省掉 useSearchParams 需要的 Suspense 邊界。
    const next = window.location.pathname + window.location.search;
    window.location.replace(loginPath(next, { expired: true }));
  }, [isUnauthorized]);

  if (isUnauthorized) return null;

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
