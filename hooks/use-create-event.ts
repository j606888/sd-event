"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useUploadThing } from "@/lib/uploadthing";
import {
  CREATE_STEPS,
  DATE_PRESET_BY_TYPE,
  PUBLISH_STEPS,
  isValidRange,
  presetRange,
  presetWeekend,
  shiftEnd,
  taipeiToday,
  type CreateStep,
  type DatePreset,
} from "@/lib/create-event";
import { fromTaipeiDateTimeLocal } from "@/lib/format-event-date";
import type { EventType } from "@/lib/event-templates";
import type { TicketPlan } from "@/lib/ticket-plan";
import {
  useSavedBankInfos,
  useSavedLinePayees,
  useSavedLocations,
  useSavedOrganizers,
} from "@/hooks/use-saved-info";

const EVENT_TYPE_BY_PLAN_KIND: Record<TicketPlan["kind"], EventType> = {
  workshop: "Workshop",
  party: "Party",
  festival: "Festival",
};

const MAX_COVER_SIZE = 4 * 1024 * 1024;

/**
 * 建立活動精靈的狀態：一步一步填，最後一次建立活動（含票券），存成草稿或直接發布。
 *
 * 必填（類型、名稱、日期）沒填不能往下；發布前要填（地點、收款、票券）與選填的步驟
 * 可以「之後再填」，存成草稿後在活動頁的待辦清單補。
 */
export function useCreateEvent(teamId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tForm = useTranslations("eventForm.errors");
  const t = useTranslations("createEvent");

  const [step, setStep] = useState<CreateStep>("type");
  /** 走到過最遠的一步：預覽與步驟列依它決定哪些已經「走到」 */
  const [furthest, setFurthest] = useState(0);
  const [touched, setTouched] = useState(false);

  const [type, setTypeState] = useState<EventType | null>(null);
  const [title, setTitleState] = useState("");
  const [initialRange] = useState(() => presetRange("weekend", presetWeekend(null, taipeiToday())));
  const [startAt, setStartAtState] = useState(initialRange.startAt);
  const [endAt, setEndAtState] = useState(initialRange.endAt);
  const [preset, setPreset] = useState<DatePreset | null>(null);
  /** 自己選過日期就不再跟著活動類型換 */
  const [datesTouched, setDatesTouched] = useState(false);

  const [locationId, setLocationIdState] = useState<number | null>(null);
  const [organizerId, setOrganizerIdState] = useState<number | null>(null);
  const [bankInfoId, setBankInfoIdState] = useState<number | null>(null);
  const [linePay, setLinePayState] = useState(false);
  const [linePayeeId, setLinePayeeIdState] = useState<number | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [description, setDescriptionState] = useState("");
  const [ticketPlan, setTicketPlan] = useState<TicketPlan | null>(null);

  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 存草稿時必填還沒填：在那一步顯示提示 */
  const [showRequired, setShowRequired] = useState(false);
  // 中途失敗再按一次時，不要重複建立活動、重複上傳封面、重複寫票券
  const createdEventIdRef = useRef<number | null>(null);
  const uploadedCoverRef = useRef<{ file: File; url: string } | null>(null);
  const savedPlanRef = useRef<TicketPlan | null>(null);

  const locations = useSavedLocations(teamId);
  const organizers = useSavedOrganizers(teamId);
  const bankInfos = useSavedBankInfos(teamId);
  const linePayees = useSavedLinePayees(teamId);

  const { startUpload } = useUploadThing("eventCover");

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // 重新整理、關分頁時，瀏覽器先問一次（填到一半的內容只在記憶體裡）。
  // 存好或確認離開後就不擋：router.push 失敗時 Next 會退回整頁跳轉，也會觸發 beforeunload
  const leavingRef = useRef(false);
  useEffect(() => {
    if (!touched) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!leavingRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [touched]);

  const leave = () => {
    if (touched && !window.confirm(t("header.leaveConfirm"))) return;
    leavingRef.current = true;
    router.push("/events");
  };

  const touch = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
    setTouched(true);
    fn(...args);
  };

  const applyPreset = (next: DatePreset) => {
    const range = presetRange(next, presetWeekend(startAt.slice(0, 10), taipeiToday()));
    setStartAtState(range.startAt);
    setEndAtState(range.endAt);
    setPreset(next);
  };

  /** 換類型：日期沒自己改過就換成該類型常見的時間；已設定的票券是照舊類型產生的，要清掉 */
  const setType = (next: EventType) => {
    if (next === type) return;
    if (ticketPlan && !window.confirm(t("type.switchConfirm"))) return;
    setTypeState(next);
    setTicketPlan(null);
    if (!datesTouched) applyPreset(DATE_PRESET_BY_TYPE[next]);
  };

  const pickPreset = (next: DatePreset) => {
    setDatesTouched(true);
    applyPreset(next);
  };

  const setStartAt = (next: string) => {
    setDatesTouched(true);
    setPreset(null);
    setEndAtState((end) => shiftEnd(startAt, next, end));
    setStartAtState(next);
  };

  const setEndAt = (next: string) => {
    setDatesTouched(true);
    setPreset(null);
    setEndAtState(next);
  };

  const pickCover = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCoverError(tForm("notAnImage"));
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      setCoverError(tForm("imageTooLarge"));
      return;
    }
    setCoverError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverError(null);
  };

  /** 售票精靈完成：精靈裡也能改活動型態，類型跟著答案走 */
  const applyTicketPlan = (plan: TicketPlan) => {
    setTicketPlan(plan);
    setTypeState(EVENT_TYPE_BY_PLAN_KIND[plan.kind]);
  };

  const datesValid = isValidRange(startAt, endAt);
  const filled: Record<CreateStep, boolean> = {
    type: type != null,
    title: title.trim() !== "",
    dates: datesValid,
    location: locationId != null,
    cover: coverFile != null,
    description: description.trim() !== "",
    organizer: organizerId != null,
    // 選了開放 LINE Pay 就要選收款好友，不然存檔時會默默不開
    payment: bankInfoId != null && (!linePay || linePayeeId != null),
    tickets: ticketPlan != null,
    review: true,
  };
  const requiredValid = filled.type && filled.title && filled.dates;
  const missing = PUBLISH_STEPS.filter((s) => !filled[s]);

  const idx = CREATE_STEPS.indexOf(step);

  const goTo = (next: CreateStep) => {
    const i = CREATE_STEPS.indexOf(next);
    setStep(next);
    setFurthest((f) => Math.max(f, i));
  };

  /** 步驟列能不能直接跳過去：往回都可以；往後要先把必填的三步填好 */
  const canJumpTo = (target: CreateStep) => CREATE_STEPS.indexOf(target) <= idx || requiredValid;

  const next = () => {
    if (idx < CREATE_STEPS.length - 1) goTo(CREATE_STEPS[idx + 1]);
  };
  const back = () => {
    if (idx > 0) setStep(CREATE_STEPS[idx - 1]);
  };

  const submit = async (publish: boolean) => {
    if (!requiredValid || type == null) {
      setShowRequired(true);
      setStep(!filled.type ? "type" : !filled.title ? "title" : "dates");
      return;
    }
    if (publish && missing.length > 0) return;
    setSaving(publish ? "publish" : "draft");
    setSaveError(null);

    let stage: "save" | "tickets" | "publish" = "save";
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        if (uploadedCoverRef.current?.file === coverFile) {
          coverUrl = uploadedCoverRef.current.url;
        } else {
          const res = await startUpload([coverFile]);
          const first = res?.[0];
          const url =
            first && ("url" in first ? first.url : (first as { ufsUrl?: string }).ufsUrl);
          if (!url) throw new Error(tForm("coverUploadFailed"));
          uploadedCoverRef.current = { file: coverFile, url };
          coverUrl = url;
        }
      }

      const fields = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        coverUrl,
        startAt: fromTaipeiDateTimeLocal(startAt),
        endAt: fromTaipeiDateTimeLocal(endAt),
        locationId,
        organizerId,
        bankInfoId,
        linePayeeId: linePay ? linePayeeId : null,
      };

      let eventId = createdEventIdRef.current;
      if (eventId == null) {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            teamId,
            ...fields,
            allowMultiplePurchase: false,
            autoCalcAmount: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.event?.id == null) throw new Error(data.error || t("errors.saveFailed"));
        eventId = data.event.id as number;
        createdEventIdRef.current = eventId;
      } else {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(fields),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("errors.saveFailed"));
      }

      if (ticketPlan && savedPlanRef.current !== ticketPlan) {
        stage = "tickets";
        const res = await fetch(`/api/events/${eventId}/ticket-plan`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan: ticketPlan }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("errors.ticketsFailed"));
        savedPlanRef.current = ticketPlan;
      }

      if (publish) {
        stage = "publish";
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "published" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("errors.publishFailed"));
      }

      queryClient.invalidateQueries({ queryKey: ["events"] });
      leavingRef.current = true;
      router.push(`/events/${eventId}`);
    } catch (e) {
      const fallback =
        stage === "tickets" ? t("errors.ticketsFailed") : stage === "publish" ? t("errors.publishFailed") : t("errors.saveFailed");
      setSaveError(e instanceof Error && e.message ? e.message : fallback);
      setSaving(null);
    }
  };

  return {
    teamId,
    // 步驟
    step,
    idx,
    furthest,
    goTo,
    canJumpTo,
    next,
    back,
    filled,
    requiredValid,
    missing,
    touched,
    leave,
    showRequired,
    // 答案
    type,
    setType: touch(setType),
    title,
    setTitle: touch(setTitleState),
    startAt,
    endAt,
    preset,
    datesValid,
    pickPreset: touch(pickPreset),
    setStartAt: touch(setStartAt),
    setEndAt: touch(setEndAt),
    locationId,
    setLocationId: touch(setLocationIdState),
    organizerId,
    setOrganizerId: touch(setOrganizerIdState),
    bankInfoId,
    setBankInfoId: touch(setBankInfoIdState),
    linePay,
    setLinePay: touch(setLinePayState),
    linePayeeId,
    setLinePayeeId: touch(setLinePayeeIdState),
    coverPreview,
    coverError,
    pickCover: touch(pickCover),
    removeCover,
    description,
    setDescription: touch(setDescriptionState),
    ticketPlan,
    applyTicketPlan: touch(applyTicketPlan),
    // 常用資訊
    locations,
    organizers,
    bankInfos,
    linePayees,
    // 送出
    saving,
    saveError,
    submit,
  };
}

export type UseCreateEventReturn = ReturnType<typeof useCreateEvent>;
