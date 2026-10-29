"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { money } from "@/components/events/management/tickets/wizard/plan-view";
import { CREATE_STEPS, type CreateStep } from "@/lib/create-event";
import type { Locale } from "@/lib/locale";
import { cn, isRenderableImageSrc } from "@/lib/utils";
import type { UseCreateEventReturn } from "@/hooks/use-create-event";
import { planTicketSummary, shortWhen } from "./CreateEventSteps";

/** 預覽裡的描述只是示意：拿掉 Markdown 記號，留前幾行 */
function plainDescription(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__/g, "")
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, ""))
    .filter((line) => line.trim() !== "")
    .join("\n");
}

/** 還沒走到的欄位：灰條 */
function Bar({ className }: { className: string }) {
  return <span aria-hidden className={cn("block rounded bg-field", className)} />;
}

/**
 * 報名頁預覽：填到哪，這裡就長到哪。
 * 還沒走到的步驟是灰條，跳過的寫「未定」；正在填的那一塊會亮起來。
 */
export function CreateEventPreview({ form }: { form: UseCreateEventReturn }) {
  const t = useTranslations("createEvent");
  const locale = useLocale() as Locale;
  const reached = (s: CreateStep) => CREATE_STEPS.indexOf(s) <= form.furthest;
  // 收款顯示在票價那一列，所以填收款時亮的是那一塊
  const lit = (s: CreateStep | CreateStep[]) =>
    (Array.isArray(s) ? s : [s]).includes(form.step) && "bg-brand-soft ring-2 ring-brand";

  const location = form.locations.data?.find((l) => l.id === form.locationId);
  const organizer = form.organizers.data?.find((o) => o.id === form.organizerId);
  const tickets = form.ticketPlan ? planTicketSummary(form.ticketPlan) : null;
  const description = plainDescription(form.description);
  const canRegister = form.missing.length === 0;

  return (
    <div className="overflow-hidden rounded-[18px] border border-card-border bg-white" aria-hidden>
      <div className={cn("m-2.5 rounded-xl transition-shadow", lit("cover"))}>
        {reached("cover") && form.coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: preview of a file that isn't uploaded yet
          <img src={form.coverPreview} alt="" className="aspect-video w-full rounded-[10px] object-cover" />
        ) : reached("cover") ? (
          <div className="flex aspect-video items-center justify-center rounded-[10px] border border-dashed border-gray-300 bg-paper text-[13px] text-muted-ink">
            {t("preview.noCover")}
          </div>
        ) : (
          <div className="aspect-video rounded-[10px] bg-field" />
        )}
      </div>

      <div className="flex flex-col gap-1 px-4 pb-4 pt-1">
        <div className={cn("-mx-1.5 self-start rounded-lg px-1.5 py-0.5", lit("type"))}>
          {form.type ? (
            <span className="inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">
              {t(`type.options.${form.type}.title`)}
            </span>
          ) : (
            <Bar className="h-5 w-16 rounded-full" />
          )}
        </div>

        <div className={cn("-mx-1.5 rounded-lg px-1.5 py-1", lit("title"))}>
          {reached("title") && form.filled.title ? (
            <h3 className="break-words font-display text-xl font-bold leading-snug text-ink">{form.title}</h3>
          ) : (
            <Bar className="h-[22px] w-3/4 bg-hairline" />
          )}
        </div>

        <div className={cn("-mx-1.5 flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm", lit("dates"))}>
          <CalendarDays className="size-4 shrink-0 text-muted-ink" />
          {reached("dates") ? (
            <span className="min-w-0 text-ink">{shortWhen(form.startAt, form.endAt, locale)}</span>
          ) : (
            <Bar className="h-2.5 w-1/2" />
          )}
        </div>

        <div className={cn("-mx-1.5 flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm", lit("location"))}>
          <MapPin className="size-4 shrink-0 text-muted-ink" />
          {!reached("location") ? (
            <Bar className="h-2.5 w-3/5" />
          ) : location ? (
            <span className="min-w-0 truncate text-ink">{location.name}</span>
          ) : (
            <span className="text-muted-ink">{t("preview.noLocation")}</span>
          )}
        </div>

        <div className={cn("-mx-1.5 flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm", lit("organizer"))}>
          {organizer && isRenderableImageSrc(organizer.photoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar; organizer photos may come from any host
            <img src={organizer.photoUrl} alt="" className="size-4 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-field text-[10px] font-bold text-brand-strong">
              {organizer?.name.charAt(0) ?? ""}
            </span>
          )}
          {!reached("organizer") ? (
            <Bar className="h-2.5 w-2/5" />
          ) : organizer ? (
            <span className="min-w-0 truncate text-ink">{organizer.name}</span>
          ) : (
            <span className="text-muted-ink">{t("preview.noOrganizer")}</span>
          )}
        </div>

        <div className={cn("-mx-1.5 mt-1 rounded-lg p-1.5", lit("description"))}>
          {reached("description") && description ? (
            <p className="line-clamp-4 whitespace-pre-line text-[13px] text-gray-700">{description}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Bar className="h-2.5 w-full" />
              <Bar className="h-2.5 w-4/5" />
            </div>
          )}
        </div>

        <div
          className={cn(
            "-mx-1.5 mt-2 flex items-center justify-between gap-2.5 rounded-b-lg border-t border-hairline px-1.5 pb-1.5 pt-2.5",
            lit(["payment", "tickets"])
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {reached("payment") ? (
              <span className="text-xs text-muted-ink">
                {form.bankInfoId == null
                  ? t("preview.noPayment")
                  : form.linePay && form.linePayeeId != null
                    ? t("preview.bankAndLine")
                    : t("preview.bankTransfer")}
              </span>
            ) : (
              <Bar className="h-2 w-1/2" />
            )}
            {!reached("tickets") ? (
              <Bar className="h-3.5 w-2/5 bg-hairline" />
            ) : tickets ? (
              <span className="font-bold tabular-nums text-ink">
                {t("tickets.from", { price: money(tickets.min) })}
              </span>
            ) : (
              <span className="text-sm font-medium text-muted-ink">{t("preview.noTickets")}</span>
            )}
          </div>
          <span
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-[10px] px-4 text-sm font-bold",
              canRegister ? "bg-brand text-ink" : "bg-field text-gray-500"
            )}
          >
            {t("preview.register")}
          </span>
        </div>
      </div>
    </div>
  );
}
