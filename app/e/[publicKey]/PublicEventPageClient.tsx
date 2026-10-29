"use client";

import { useTranslations } from "next-intl";
import { EventApplicationForm } from "@/components/events/registration/EventApplicationForm";
import { usePublicEvent } from "@/hooks/use-public-event";

type PublicEventPageClientProps = {
  publicKey: string;
};

export function PublicEventPageClient({ publicKey }: PublicEventPageClientProps) {
  const t = useTranslations("publicEvent.page");
  const tCommon = useTranslations("common");
  const { data: event, isLoading, isError, error } = usePublicEvent(publicKey);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">{tCommon("loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error?.message || t("loadFailed")}</p>
        <p className="text-sm text-gray-500">{t("linkInvalid")}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{t("notFound")}</p>
        <p className="text-sm text-gray-500">{t("linkInvalid")}</p>
      </div>
    );
  }

  return (
    <>
      {event.status === "draft" && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          {t("draftPreview")}
        </div>
      )}
      <EventApplicationForm event={event} />
    </>
  );
}
