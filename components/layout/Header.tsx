"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

type Team = { id: number; name: string } | null;

type HeaderProps = {
  onMenuClick: () => void;
  team: Team;
};

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center bg-ink px-2 lg:px-4 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex lg:hidden size-10 shrink-0 items-center justify-center text-white/70 hover:text-white"
        aria-label="開啟選單"
      >
        <Menu className="size-6" />
      </button>

      <div className="flex flex-col flex-1 items-start px-2">
        <Link
          href="/events"
          className="shrink-0 font-display text-lg font-bold text-white"
        >
          SD Event<span className="text-follower">.</span>
        </Link>
      </div>
    </header>
  );
}
