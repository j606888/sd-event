"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentTeam } from "@/hooks/use-current-team";

export default function TeamsPage() {
  const router = useRouter();
  const { teamId, isLoading: loading } = useCurrentTeam();

  useEffect(() => {
    if (!loading) {
      if (teamId) {
        router.replace(`/teams/${teamId}`);
      } else {
        // If no team, redirect to events page
        router.replace("/events");
      }
    }
  }, [teamId, loading, router]);

  return (
    <div className="p-6">
      <p className="text-gray-500">載入中…</p>
    </div>
  );
}
