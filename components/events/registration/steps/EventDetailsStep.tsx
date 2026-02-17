"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { formatEventDate, getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";
import type { PublicEventData } from "@/types/event";
import { Clock, MapPin } from "lucide-react";
import { siInstagram, siLine, siFacebook } from "simple-icons";

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
  return (
    <div className="min-h-screen bg-gray-400 p-4">
      <div className="mx-auto max-w-lg bg-white rounded-lg overflow-hidden">
        {event.coverUrl && (
          <div className="relative w-full">
            <Image
              src={event.coverUrl}
              alt={event.title}
              layout="responsive"
              width={1200}
              height={600}
              className="object-cover"
              unoptimized
              sizes="100vw"
            />
          </div>
        )}
        <div className="p-4 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
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
                      className="text-sm text-[#5295BC] mt-1 inline-block"
                    >
                      導航 &gt;
                    </a>
                  )}
              </div>
            )}
          </div>

          {event.description && (
            <div className="text-gray-800 whitespace-pre-wrap text-[15px] leading-relaxed border-b border-gray-200 pb-6">
              {event.description}
            </div>
          )}

          {event.purchaseItems.length > 0 && (
            <div className="space-y-2 pb-6 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">方案介紹</h2>
              <div className="space-y-2">
                {event.purchaseItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[15px]"
                  >
                    <div className="text-gray-900">{item.name}</div>
                    <div className="text-gray-900">${item.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.organizer && (
            <div className="space-y-2 pb-6 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">主辦單位</h2>
              <div className="flex items-center gap-3">
                {event.organizer.photoUrl && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                    <Image
                      src={event.organizer.photoUrl}
                      alt={event.organizer.name}
                      fill
                      className="object-cover"
                      unoptimized
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
              <h2 className="font-semibold text-gray-900">報名須知</h2>
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
                className="mt-0.5 w-4 h-4 text-[#5295BC] border-gray-300 rounded focus:ring-[#5295BC]"
              />
              <span className="text-[15px] text-gray-700">我已閱讀並同意報名須知</span>
            </label>
          )}

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="w-full bg-[#5295BC] text-white hover:bg-[#4285A5] h-12 text-base font-medium"
          >
            報名活動
          </Button>
        </div>
      </div>
    </div>
  );
}
