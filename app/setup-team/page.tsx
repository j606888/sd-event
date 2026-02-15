"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teams", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) router.replace("/login");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setTeams([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setTeams(data.teams ?? []);
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!loading && teams.length > 0) {
      router.replace("/events");
    }
  }, [loading, teams.length, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setSubmitError("請輸入團隊名稱");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "建立失敗");
        setSubmitting(false);
        return;
      }
      router.push("/events");
      router.refresh();
    } catch {
      setSubmitError("建立失敗");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (teams.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500">正在導向…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100">
      <main className="w-full max-w-md flex-1 flex flex-col justify-center p-6">
        <h1
          className="text-[28px] font-extrabold text-[#5295BC] mb-2 self-start"
          style={{ fontFamily: "var(--font-nunito)" }}
        >
          SD Event.
        </h1>
        <p className="text-gray-600 mb-8">請先建立一個團隊，才能開始使用活動功能。</p>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 mb-6">
            <Label htmlFor="team-name">團隊名稱</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入團隊名稱"
              disabled={submitting}
            />
          </div>
          {submitError && (
            <p className="text-sm text-red-500 mb-4">{submitError}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-[#5295BC] hover:bg-[#4285A] text-white"
            disabled={submitting}
          >
            {submitting ? "建立中…" : "建立團隊"}
          </Button>
        </form>
      </main>
    </div>
  );
}
