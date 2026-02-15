"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
} | null;

export default function EventsPage() {
  const [user, setUser] = useState<UserInfo>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("未登入");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setError("未登入或登入已過期"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">{error}</p>
        <Link href="/login" className="text-[#5295BC] underline mt-2 inline-block">
          前往登入
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#5295BC] mb-6" style={{ fontFamily: "var(--font-nunito)" }}>
        SD Event. — Events
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Debug: 目前登入使用者</h2>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </section>

      <Link href="/" className="text-[#5295BC] underline">
        回首頁
      </Link>
    </div>
  );
}
