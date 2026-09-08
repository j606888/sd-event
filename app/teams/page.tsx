"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentTeam } from "@/hooks/use-current-team";

export default function TeamsPage() {
  const router = useRouter();
  const { teamId, isLoading: loading, error } = useCurrentTeam();

  useEffect(() => {
    // 載入失敗時不要盲目轉址 —— 以前不管原因一律 replace("/events")，
    // 等於把載不到團隊的人原封不動彈進另一頁同樣載不到團隊的畫面。
    if (loading || error) return;
    if (teamId) {
      router.replace(`/teams/${teamId}`);
    } else {
      router.replace("/events");
    }
  }, [teamId, loading, error, router]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-gray-500">載入中…</p>
    </div>
  );
}
