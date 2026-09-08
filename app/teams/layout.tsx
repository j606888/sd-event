import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionState } from "@/lib/auth";
import { getGuardContext } from "@/lib/request-path";
import { loginPath } from "@/lib/safe-next-path";

export default async function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getSessionState();
  if (state.status !== "valid") {
    const { path, expired } = await getGuardContext();
    redirect(loginPath(path, { expired: expired || state.status === "expired" }));
  }

  return <AppShell>{children}</AppShell>;
}
