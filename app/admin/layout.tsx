import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, Calendar, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/api-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // 模擬檢視中不得進入總後台（middleware 也會擋，這裡是第二層保險）
  if (typeof session.impersonatorId === "number") redirect("/events");
  if (!(await isSuperAdminUser(session.userId))) redirect("/events");

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 bg-ink">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:h-16">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-display text-lg font-bold text-white"
          >
            <ShieldCheck className="size-5 text-follower" />
            總管理
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <AdminNavLink href="/admin" icon={Users} label="使用者" />
            <AdminNavLink href="/admin/events" icon={Calendar} label="活動" />
          </nav>

          <Link
            href="/events"
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            回到我的後台
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
