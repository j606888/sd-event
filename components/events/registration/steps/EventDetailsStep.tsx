"use client";

import { Fragment } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { Markdown } from "@/components/ui/markdown";
import { getEventDateLabel, getEventTimeRange, formatTierDeadline } from "@/lib/format-event-date";
import { TicketPriceLine } from "../TicketPriceLine";
import type { EventPurchaseItem, PublicEventData } from "@/types/event";
import { Clock, MapPin, Disc3 } from "lucide-react";
import { siInstagram, siLine, siFacebook } from "simple-icons";
import { isRenderableImageSrc } from "@/lib/utils";

type EventDetailsStepProps = {
  event: PublicEventData;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (value: boolean) => void;
  canProceed: boolean;
  onNext: () => void;
};

export function EventDetailsStep({
  event,
  agreedToTerms,
  onAgreedToTermsChange,
  canProceed,
  onNext,
}: EventDetailsStepProps) {
  const hasCover = isRenderableImageSrc(event.coverUrl);

  // 方案介紹依票券區塊分段，讓報名者先看懂「有哪幾類方案」再進報名步驟。
  // 未使用區塊的活動（groups 為空）維持單一無標題清單。
  const introSections: { key: string; title: string | null; items: EventPurchaseItem[] }[] =
    event.groups.length > 0
      ? [
          ...event.groups
            .filter((group) => group.items.length > 0)
            .map((group) => ({
              key: `group-${group.id}`,
              title: group.title,
              items: group.items,
            })),
          // 區塊被刪除後 group_id 會變成 null，這些孤兒票券仍要列出來
          ...(() => {
            const ungrouped = event.purchaseItems.filter((i) => i.groupId == null);
            return ungrouped.length > 0
              ? [{ key: "ungrouped", title: null, items: ungrouped }]
              : [];
          })(),
        ]
      : [{ key: "all", title: null, items: event.purchaseItems }];

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-[#2c5d7c] p-4 sm:py-10">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        {isRenderableImageSrc(event.coverUrl) ? (
          <div className="relative w-full">
            <Image
              src={event.coverUrl}
              alt={event.title}
              layout="responsive"
              width={1200}
              height={600}
              className="object-cover"
              sizes="100vw"
            />
          </div>
        ) : (
          <div className="relative flex h-36 items-end overflow-hidden bg-gradient-to-br from-leader to-follower p-5">
            <Disc3 className="absolute -right-2 -top-2 size-24 text-white/15" />
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-sm">
              {event.title}
            </h1>
          </div>
        )}
        <div className="space-y-6 p-5">
          {hasCover && (
            <h1 className="font-display text-2xl font-semibold text-ink">
              {event.title}
            </h1>
          )}
          <div className="space-y-3 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-4">
              <Clock className="w-6 h-6 text-gray-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-gray-900 text-[15px]">
                  {getEventDateLabel(event.startAt, event.endAt)}
                </span>
                <span className="text-gray-900 text-[15px]">
                  {getEventTimeRange(event.startAt, event.endAt)}
                </span>
              </div>
            </div>
            {event.location && (
              <div className="flex items-center gap-4">
                <MapPin className="w-6 h-6 text-gray-500 shrink-0" />
                <div className="flex-1 flex flex-col">
                  <div className="text-gray-900 text-[15px]">{event.location.name}</div>
                  {event.location.address && (
                    <div className="text-gray-500 text-[15px]">
                      {event.location.address}
                    </div>
                  )}
                </div>
                  {event.location.googleMapUrl && (
                    <a
                      href={event.location.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand mt-1 inline-block"
                    >
                      導航 &gt;
                    </a>
                  )}
              </div>
            )}
          </div>

          {event.description && (
            <div className="border-b border-gray-200 pb-6">
              <Markdown className="text-[15px] leading-relaxed text-gray-800">
                {event.description}
              </Markdown>
            </div>
          )}

          {event.purchaseItems.length > 0 && (
            <div className="space-y-3 pb-6 border-b border-gray-200">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink">方案介紹</h2>
                {event.activeTier?.endsAt && (
                  <span className="rounded-full bg-follower/10 px-2.5 py-0.5 text-xs font-medium text-follower">
                    {event.activeTier.name}價至 {formatTierDeadline(event.activeTier.endsAt)} 止
                  </span>
                )}
              </div>
              {/* 每個區塊自成一段：hairline 分隔 + 深色標題 + 色條，讓「有哪幾類方案」一眼分得出來。
                  每段各自一個 grid，價格仍靠右，右緣跨區塊維持一直線。 */}
              <div className="divide-y divide-gray-100">
                {introSections.map((section) => (
                  <div
                    key={section.key}
                    className="space-y-2.5 py-4 first:pt-0 last:pb-0"
                  >
                    {section.title && (
                      <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                        <span
                          aria-hidden
                          className="h-4 w-1 shrink-0 rounded-full bg-follower"
                        />
                        {section.title}
                      </h3>
                    )}
                    <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3">
                      {section.items.map((item) => (
                        <Fragment key={item.id}>
                          <div className="min-w-0 pt-0.5 text-[15px] text-gray-900">
                            {item.name}
                          </div>
                          <TicketPriceLine
                            variant="intro"
                            amount={item.amount}
                            fullAmount={item.fullAmount}
                            fullTierName={event.fullPriceTierName}
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.organizer && (
            <div className="space-y-2 pb-6 border-b border-gray-200">
              <h2 className="font-display text-base font-semibold text-ink">主辦單位</h2>
              <div className="flex items-center gap-3">
                {isRenderableImageSrc(event.organizer.photoUrl) && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                    <Image
                      src={event.organizer.photoUrl}
                      alt={event.organizer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{event.organizer.name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    {event.organizer.instagram && (
                      <a
                        href={event.organizer.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <SimpleIcon icon={siInstagram} size={20} />
                      </a>
                    )}
                    {event.organizer.lineId && (
                      <a
                        href={`https://line.me/ti/p/${event.organizer.lineId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <SimpleIcon icon={siLine} size={20} />
                      </a>
                    )}
                    {event.organizer.facebook && (
                      <a
                        href={event.organizer.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <SimpleIcon icon={siFacebook} size={20} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {event.noticeItems.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold text-ink">報名須知</h2>
              <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-800">
                {event.noticeItems.map((notice) => (
                  <li key={notice.id}>{notice.content}</li>
                ))}
              </ol>
            </div>
          )}

          {event.noticeItems.length > 0 && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => onAgreedToTermsChange(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
              />
              <span className="text-[15px] text-gray-700">我已閱讀並同意報名須知</span>
            </label>
          )}

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="w-full bg-brand text-white hover:bg-brand-hover h-12 text-base font-medium"
          >
            報名活動
          </Button>
        </div>
      </div>
    </div>
  );
}
