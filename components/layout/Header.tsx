"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

type Team = { id: number; name: string } | null;

type HeaderProps = {
  onMenuClick: () => void;
  team: Team;
};

export function Header({ onMenuClick, team }: HeaderProps) {
  const teamLabel = team?.name ?? "選擇團隊";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-gray-200 bg-white px-2 lg:px-4">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex lg:hidden size-10 shrink-0 items-center justify-center text-gray-600 hover:text-gray-900"
        aria-label="開啟選單"
      >
        <Menu className="size-6" />
      </button>

      <div className="flex flex-col flex-1 items-start px-2">
        <Link
          href="/events"
          className="shrink-0 font-extrabold text-[#5295BC]"
          style={{ fontFamily: "var(--font-nunito)" }}
        >
          SD Event
        </Link>
      </div>
    </header>
  );
}
