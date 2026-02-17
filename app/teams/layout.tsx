import { AppShell } from "@/components/layout/AppShell";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
