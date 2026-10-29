"use client";

import { useTranslations } from "next-intl";
import { CreateEventWizard } from "@/components/events/create/CreateEventWizard";
import { useCurrentTeam } from "@/hooks/use-current-team";
import { useRequireTeamAdmin } from "@/hooks/use-require-team-admin";

export default function NewEventPage() {
  const { teamId } = useCurrentTeam();
  const { ready } = useRequireTeamAdmin();
  const tCommon = useTranslations("common");

  if (teamId == null || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  return <CreateEventWizard teamId={teamId} />;
}
