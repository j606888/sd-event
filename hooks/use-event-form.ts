"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useUploadThing } from "@/lib/uploadthing";
import {
  getEventTemplate,
  type EventType,
  type TemplateTextKey,
} from "@/lib/event-templates";
import { compileTicketPlan, type TicketPlan } from "@/lib/ticket-plan";
import {
  taipeiDateInput,
  taipeiDateTimeLocal,
  fromTaipeiDateTimeLocal,
} from "@/lib/format-event-date";
import {
  remapPricesAfterTierRemoval,
  shiftPricesAfterTierInsert,
} from "@/lib/ticket-draft-prices";

export type DrawerType =
  | null
  | "location"
  | "purchaseItem"
  | "notice"
  | "organizer"
  | "bank"
  | "linePayee";

/** 項目於某時段的價格；create 模式 tier 尚無 id，用 tierDraftIndex 暫referer */
export type ItemTierPriceDraft = {
  tierId?: number;
  tierDraftIndex?: number;
  amount: number;
  /** false = 此時段不販售（如早鳥限定票）；未定義 = 販售 */
  available?: boolean;
};

export type PurchaseItemDraft = {
  id?: number;
  name: string;
  amount: number;
  /** 不在公開報名表顯示（已儲存項目由後端同步；新建項目僅存於表單狀態） */
  hidden?: boolean;
  /** 各時段價（可空 = 全部用 amount fallback） */
  prices?: ItemTierPriceDraft[];
  /** 已綁定的未隱藏報名數（已儲存項目由後端帶入）；0 或未定義＝可刪除 */
  soldCount?: number;
  /** 所屬票種群組（已儲存群組）；null = 未分組 */
  groupId?: number | null;
  /** create 模式群組尚無 id 時，暫referer 草稿群組 index */
  groupDraftIndex?: number;
  /** 一張票含幾位參加者；>1 為套票（如雙人票）。未定義 = 1 */
  seatCount?: number;
  /** 票券說明（選填），顯示於報名表票券名稱下方 */
  description?: string | null;
  /** 選了此票的報名至少要有幾位參加者勾選活動的勾選項目；未定義 = 0 */
  minFlagged?: number;
};

/** 票種群組草稿 */
export type PurchaseItemGroupDraft = {
  id?: number;
  title: string;
  selectionMode: "single" | "multiple";
  required: boolean;
  sortOrder: number;
};

/** 票價時段草稿；endsAt 為 "YYYY-MM-DD"（空 = fallback 段，永不過期） */
export type PriceTierDraft = {
  id?: number;
  name: string;
  endsAt: string;
  sortOrder: number;
};

export type NoticeItemDraft = { id?: number; content: string };

/** 折扣碼草稿；value / usageLimit 以字串存放對應 input（usageLimit 空 = 不限） */
export type CouponDraft = {
  id?: number;
  code: string;
  discountType: "fixed" | "percent";
  value: string;
  usageLimit: string;
  usedCount?: number;
};

/** ISO 時間轉成 date input 的 "YYYY-MM-DD"（Asia/Taipei） */
function toDateInput(iso: string | null | undefined): string {
  return taipeiDateInput(iso);
}

export type EventFormInitialData = {
  id: number;
  teamId: number;
  type: EventType;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  locationId: number | null;
  organizerId: number | null;
  bankInfoId: number | null;
  linePayeeId?: number | null;
  allowMultiplePurchase: boolean;
  autoCalcAmount: boolean;
  attendeeFlagLabel?: string | null;
};

type Location = { id: number; name: string };
type Organizer = {
  id: number;
  name: string;
  photoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
};
type BankInfo = {
  id: number;
  label: string | null;
  bankName: string;
  bankCode: string;
  account: string | null;
};

type LinePayee = { id: number; label: string; lineId: string };

function toDateTimeLocal(iso: string): string {
  return taipeiDateTimeLocal(iso);
}

type TicketDrafts = {
  priceTiers: PriceTierDraft[];
  groups: PurchaseItemGroupDraft[];
  purchaseItems: PurchaseItemDraft[];
  groupExclusions: Array<[string, string]>;
  coupons: CouponDraft[];
};

/** 把精靈答案轉成 create 模式的草稿（時段／區塊以 draft index 互相參照，跟範本一樣） */
function ticketPlanToDrafts(plan: TicketPlan): TicketDrafts {
  const compiled = compileTicketPlan(plan);
  const tierIndex = new Map(compiled.tiers.map((t, i) => [t.key, i]));
  const groupIndex = new Map(compiled.groups.map((g, i) => [g.key, i]));
  return {
    priceTiers: compiled.tiers.map((t, i) => ({ name: t.name, endsAt: t.endsAt, sortOrder: i })),
    groups: compiled.groups.map((g, i) => ({
      title: g.title,
      selectionMode: g.selectionMode,
      required: g.required,
      sortOrder: i,
    })),
    purchaseItems: compiled.items.map((it) => ({
      name: it.name,
      amount: it.amount,
      hidden: false,
      groupDraftIndex: groupIndex.get(it.groupKey),
      seatCount: it.seatCount,
      description: it.description,
      minFlagged: 0,
      prices: it.prices.map((p) => ({
        tierDraftIndex: tierIndex.get(p.tierKey),
        amount: p.amount,
        available: p.available,
      })),
    })),
    groupExclusions: compiled.exclusions.map(([a, b]): [string, string] => [
      `draft-${groupIndex.get(a)}`,
      `draft-${groupIndex.get(b)}`,
    ]),
    coupons: compiled.coupon
      ? [
          {
            code: compiled.coupon.code,
            discountType: "percent",
            value: String(compiled.coupon.percentOff),
            usageLimit:
              compiled.coupon.usageLimit == null ? "" : String(compiled.coupon.usageLimit),
          },
        ]
      : [],
  };
}

/** create 模式比對草稿是否還是精靈產生的樣子（之後在進階模式改過就不算） */
function ticketDraftsSignature(d: TicketDrafts): string {
  return JSON.stringify({
    tiers: d.priceTiers.map((t) => [t.name, t.endsAt]),
    groups: d.groups.map((g) => [g.title, g.selectionMode, g.required]),
    items: d.purchaseItems.map((i) => [
      i.name,
      i.amount,
      i.hidden === true,
      i.groupDraftIndex ?? i.groupId ?? null,
      i.seatCount ?? 1,
      i.description ?? null,
      i.minFlagged ?? 0,
      (i.prices ?? []).map((p) => [p.tierDraftIndex ?? p.tierId, p.amount, p.available !== false]),
    ]),
    exclusions: d.groupExclusions.map(([a, b]) => [a, b].sort()).sort(),
    coupons: d.coupons.map((c) => [c.code.trim().toUpperCase(), c.discountType, c.value, c.usageLimit]),
  });
}

const EVENT_TYPE_BY_PLAN_KIND: Record<TicketPlan["kind"], EventType> = {
  workshop: "Workshop",
  party: "Party",
  festival: "Festival",
};

function datetimeLocalToISO(datetimeLocal: string): string {
  return fromTaipeiDateTimeLocal(datetimeLocal) ?? new Date().toISOString();
}

type UseEventFormParams = {
  mode: "create" | "edit";
  teamId: number;
  eventId?: number;
  initialData?: EventFormInitialData;
  /** create 模式的初始類型，決定預填的購買項目範本 */
  initialType?: EventType;
  onSaveSuccess?: () => void;
};

export function useEventForm({
  mode,
  teamId,
  eventId,
  initialData,
  initialType,
  onSaveSuccess,
}: UseEventFormParams) {
  const t = useTranslations("eventForm");
  const tTemplates = useTranslations("eventForm.templates");
  // 範本／預設時段名稱會存進活動，依建立者當下的介面語系產生
  const templateText = (key: TemplateTextKey) => tTemplates(key);
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [type, setType] = useState<EventType>(initialType ?? "Party");
  const [allowMultiple, setAllowMultiple] = useState(false);
  // 金額預設自動加總；編輯模式由 init effect 以 initialData.autoCalcAmount 覆寫
  const [autoCalcAmount, setAutoCalcAmount] = useState(true);
  /** 參加者勾選項目名稱（如「參加伸展台比賽」）；空字串 = 不使用 */
  const [attendeeFlagLabel, setAttendeeFlagLabel] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [organizerId, setOrganizerId] = useState<string>("");
  const [bankInfoId, setBankInfoId] = useState<string>("");
  const [linePayeeId, setLinePayeeId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);
  const [linePayees, setLinePayees] = useState<LinePayee[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 票券設定區（edit 模式）的自動儲存狀態；失敗訊息仍走 saveError
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const autoSaveInFlightRef = useRef(0);
  // 基本資訊／主辦收款欄位是否有尚未按「儲存變更」的變更
  const [basicDirty, setBasicDirty] = useState(false);
  // 新增活動依所選類型預填購買項目範本（時段／群組／項目／互斥），可自行增刪修改；
  // 編輯模式皆從空起始，由載入 effect 從 API 回填
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemDraft[]>(() =>
    mode === "create" ? getEventTemplate(initialType ?? "Party", templateText).purchaseItems : []
  );
  const [purchaseItemHiddenUpdatingIndex, setPurchaseItemHiddenUpdatingIndex] =
    useState<number | null>(null);
  const [purchaseItemDeletingIndex, setPurchaseItemDeletingIndex] =
    useState<number | null>(null);
  // 目前正在編輯的購買項目 index（null = 抽屜為「新增」模式）
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [priceTiers, setPriceTiers] = useState<PriceTierDraft[]>(() =>
    mode === "create" ? getEventTemplate(initialType ?? "Party", templateText).priceTiers : []
  );
  const [groups, setGroups] = useState<PurchaseItemGroupDraft[]>(() =>
    mode === "create" ? getEventTemplate(initialType ?? "Party", templateText).groups : []
  );
  // 群組互斥配對；以群組 key（`id-<id>` / `draft-<index>`）成對表示，與票券設定 UI 一致
  const [groupExclusions, setGroupExclusions] = useState<Array<[string, string]>>(
    () =>
      mode === "create"
        ? getEventTemplate(initialType ?? "Party", templateText).groupExclusions
        : []
  );
  const [noticeItems, setNoticeItems] = useState<NoticeItemDraft[]>([]);
  const [coupons, setCoupons] = useState<CouponDraft[]>([]);
  // 售票精靈的答案；edit 模式從 API 載入，create 模式在精靈完成時設定
  const [ticketPlan, setTicketPlan] = useState<TicketPlan | null>(null);
  // edit 模式：伺服器比對指紋的結果（套用後沒被手動改過）
  const [serverPlanInSync, setServerPlanInSync] = useState(false);

  const initializedEventIdRef = useRef<number | null>(null);

  // 以 in-flight 計數器追蹤自動儲存中的請求；全部完成後顯示「已自動儲存」。
  // 每次開始新的自動儲存都先清掉上一次的錯誤 —— 否則一次失敗後，
  // 就算後續每一筆都存成功，「儲存失敗，請重試」也會一直掛在畫面上。
  const trackAutoSave = async <T,>(work: Promise<T>): Promise<T> => {
    autoSaveInFlightRef.current += 1;
    setSaveError(null);
    setAutoSaveStatus("saving");
    try {
      return await work;
    } finally {
      autoSaveInFlightRef.current -= 1;
      if (autoSaveInFlightRef.current <= 0) {
        autoSaveInFlightRef.current = 0;
        setAutoSaveStatus("saved");
      }
    }
  };

  /** 包住 edit 模式會直接打 API 的 mutator，讓 UI 能顯示自動儲存狀態 */
  const withAutoSave = <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>
  ) => {
    return (...args: A): Promise<R> => {
      if (mode !== "edit" || eventId == null) return fn(...args);
      return trackAutoSave(fn(...args));
    };
  };

  /** 包住基本資訊／主辦收款 setter，追蹤是否有未按「儲存變更」的變更 */
  const markBasicDirty = <A extends unknown[]>(fn: (...args: A) => void) => {
    return (...args: A) => {
      setBasicDirty(true);
      fn(...args);
    };
  };

  const { startUpload: startCoverUpload, isUploading: isUploadingCover } =
    useUploadThing("eventCover", {
      onClientUploadComplete: (res) => {
        const first = res?.[0];
        const url =
          first &&
          ("url" in first
            ? first.url
            : (first as { ufsUrl?: string }).ufsUrl);
        if (url) {
          setCoverUrl(url);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          setSelectedCoverFile(null);
        }
      },
      onUploadError: (err) => {
        console.error("Cover upload error:", err);
        setSaveError(t("errors.coverUploadFailed"));
      },
    });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchLocations = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/locations`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations ?? []);
    }
  }, [teamId]);

  const fetchOrganizers = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/organizers`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setOrganizers(data.organizers ?? []);
    }
  }, [teamId]);

  const fetchBankInfos = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/bank-infos`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setBankInfos(data.bankInfos ?? []);
    }
  }, [teamId]);

  const fetchLinePayees = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/line-payees`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setLinePayees(data.linePayees ?? []);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLocations();
    fetchOrganizers();
    fetchBankInfos();
    fetchLinePayees();
  }, [fetchLocations, fetchOrganizers, fetchBankInfos, fetchLinePayees]);

  useEffect(() => {
    if (mode !== "edit" || !initialData) {
      initializedEventIdRef.current = null;
      return;
    }
    if (initializedEventIdRef.current === initialData.id) return;

    setType(initialData.type);
    setTitle(initialData.title);
    setDescription(initialData.description ?? "");
    setCoverUrl(initialData.coverUrl);
    setSelectedCoverFile(null);
    setPreviewUrl(null);
    setStartAt(toDateTimeLocal(initialData.startAt));
    setEndAt(toDateTimeLocal(initialData.endAt));
    if (initialData.locationId != null && Number.isInteger(initialData.locationId)) {
      setLocationId(String(initialData.locationId));
    } else {
      // setLocationId("");
    }
    if (initialData.organizerId != null && Number.isInteger(initialData.organizerId)) {
      setOrganizerId(String(initialData.organizerId));
    } else {
      setOrganizerId("");
    }
    if (initialData.bankInfoId != null && Number.isInteger(initialData.bankInfoId)) {
      setBankInfoId(String(initialData.bankInfoId));
    } else {
      setBankInfoId("");
    }
    setLinePayeeId(initialData.linePayeeId != null ? String(initialData.linePayeeId) : "");
    setAllowMultiple(initialData.allowMultiplePurchase);
    setAutoCalcAmount(initialData.autoCalcAmount);
    setAttendeeFlagLabel(initialData.attendeeFlagLabel ?? "");
    initializedEventIdRef.current = initialData.id;
  }, [mode, initialData]);

  // 載入票券設定（含精靈答案）；套用精靈後也用它重新整理
  const loadTicketData = useCallback(async () => {
    if (mode !== "edit" || !eventId) return;
    await Promise.all([
      fetch(`/api/events/${eventId}/purchase-items`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/notice-items`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/price-tiers`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/purchase-item-groups`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/group-exclusions`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/coupons`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/events/${eventId}/ticket-plan`, {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([pData, nData, tData, gData, eData, cData, planData]) => {
      const items = (pData?.purchaseItems ?? []).map(
        (i: {
          id: number;
          name: string;
          amount: number;
          hidden?: boolean;
          groupId?: number | null;
          soldCount?: number;
          seatCount?: number;
          description?: string | null;
          minFlagged?: number;
          prices?: { tierId: number; amount: number; available?: boolean }[];
        }) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          hidden: Boolean(i.hidden),
          groupId: i.groupId ?? null,
          seatCount: i.seatCount ?? 1,
          description: i.description ?? null,
          minFlagged: i.minFlagged ?? 0,
          soldCount: i.soldCount ?? 0,
          prices: (i.prices ?? []).map((p) => ({
            tierId: p.tierId,
            amount: p.amount,
            available: p.available !== false,
          })),
        })
      );
      const notices = (nData?.noticeItems ?? []).map(
        (i: { id: number; content: string }) => ({
          id: i.id,
          content: i.content ?? "",
        })
      );
      const tiers = (tData?.priceTiers ?? []).map(
        (t: { id: number; name: string; endsAt: string | null; sortOrder: number }) => ({
          id: t.id,
          name: t.name,
          endsAt: toDateInput(t.endsAt),
          sortOrder: t.sortOrder,
        })
      );
      const groupList = (gData?.groups ?? []).map(
        (g: {
          id: number;
          title: string;
          selectionMode: string;
          required: boolean;
          sortOrder: number;
        }) => ({
          id: g.id,
          title: g.title,
          selectionMode: g.selectionMode === "multiple" ? "multiple" : "single",
          required: Boolean(g.required),
          sortOrder: g.sortOrder,
        })
      );
      const exclusions = (eData?.exclusions ?? []).map(
        (e: { groupAId: number; groupBId: number }): [string, string] => [
          `id-${e.groupAId}`,
          `id-${e.groupBId}`,
        ]
      );
      const couponList = (cData?.coupons ?? []).map(
        (c: {
          id: number;
          code: string;
          discountType: string;
          value: number;
          usageLimit: number | null;
          usedCount: number;
        }): CouponDraft => ({
          id: c.id,
          code: c.code,
          discountType: c.discountType === "percent" ? "percent" : "fixed",
          value: String(c.value),
          usageLimit: c.usageLimit == null ? "" : String(c.usageLimit),
          usedCount: c.usedCount ?? 0,
        })
      );
      setPurchaseItems(items);
      setNoticeItems(notices);
      setPriceTiers(tiers);
      setGroups(groupList);
      setGroupExclusions(exclusions);
      setCoupons(couponList);
      setTicketPlan((planData?.plan as TicketPlan | null) ?? null);
      setServerPlanInSync(planData?.inSync === true);
    });
  }, [mode, eventId]);

  useEffect(() => {
    void loadTicketData();
  }, [loadTicketData]);

  // create 模式：草稿還是精靈產生的樣子才算同步（在進階模式改過就改以草稿為準）
  const planDraftsSignature = useMemo(
    () => (mode === "create" && ticketPlan ? ticketDraftsSignature(ticketPlanToDrafts(ticketPlan)) : null),
    [mode, ticketPlan]
  );
  const ticketPlanInSync =
    mode === "edit"
      ? ticketPlan != null && serverPlanInSync
      : planDraftsSignature != null &&
        planDraftsSignature ===
          ticketDraftsSignature({ priceTiers, groups, purchaseItems, groupExclusions, coupons });

  const putTicketPlan = async (targetEventId: number, plan: TicketPlan) => {
    const res = await fetch(`/api/events/${targetEventId}/ticket-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("errors.updateFailed"));
    return data as { plan: TicketPlan; inSync: boolean };
  };

  /**
   * 套用精靈的答案。create 模式只換掉草稿（建立活動時再一起送）；
   * edit 模式直接寫入後重新載入票券。回傳錯誤訊息，成功回 null。
   */
  const applyTicketPlan = async (plan: TicketPlan): Promise<string | null> => {
    if (mode === "create" || eventId == null) {
      const drafts = ticketPlanToDrafts(plan);
      setPriceTiers(drafts.priceTiers);
      setGroups(drafts.groups);
      setPurchaseItems(drafts.purchaseItems);
      setGroupExclusions(drafts.groupExclusions);
      setCoupons(drafts.coupons);
      setAutoCalcAmount(true);
      setType(EVENT_TYPE_BY_PLAN_KIND[plan.kind]);
      setTicketPlan(plan);
      return null;
    }
    try {
      const saved = await trackAutoSave(putTicketPlan(eventId, plan));
      setTicketPlan(saved.plan);
      setServerPlanInSync(saved.inSync);
      await loadTicketData();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : t("errors.updateFailed");
    }
  };

  /** edit 模式：從進階模式回到售票方案前，重新確認票券有沒有被手動改過 */
  const refreshTicketPlanSync = useCallback(async () => {
    if (mode !== "edit" || !eventId) return;
    const res = await fetch(`/api/events/${eventId}/ticket-plan`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    setServerPlanInSync(data?.inSync === true);
  }, [mode, eventId]);

  const openDrawer = (type: DrawerType) => () => {
    setDrawer(type);
  };

  const closeDrawer = () => {
    setDrawer(null);
    setEditingItemIndex(null);
    setAdderDefaultGroupKey("");
  };

  // 從區塊卡「＋新增票券」帶入的預設所屬區塊（`id-<id>` / `draft-<index>`）
  const [adderDefaultGroupKey, setAdderDefaultGroupKey] = useState("");

  // 開啟「新增購買項目」抽屜（確保非編輯模式）；可帶入預設所屬區塊。
  // 防呆：直接當 onClick 用時第一參數會是事件物件，僅接受字串
  const openPurchaseItemAdder = (defaultGroupKey?: unknown) => {
    setEditingItemIndex(null);
    setAdderDefaultGroupKey(
      typeof defaultGroupKey === "string" ? defaultGroupKey : ""
    );
    setDrawer("purchaseItem");
  };

  // 開啟「編輯購買項目」抽屜（帶入指定 index 的項目）
  const openPurchaseItemEditor = (index: number) => {
    setEditingItemIndex(index);
    setDrawer("purchaseItem");
  };

  const handleStartAtChange = (value: string) => {
    setStartAt(value);
    if (value) {
      const startDate = new Date(value);
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const currentEndDate = endAt ? new Date(endAt) : null;
        if (!currentEndDate || currentEndDate <= startDate) {
          const year = endDate.getFullYear();
          const month = String(endDate.getMonth() + 1).padStart(2, "0");
          const day = String(endDate.getDate()).padStart(2, "0");
          const hours = String(endDate.getHours()).padStart(2, "0");
          const minutes = String(endDate.getMinutes()).padStart(2, "0");
          setEndAt(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError(t("errors.notAnImage"));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setSaveError(t("errors.imageTooLarge"));
      return;
    }

    setSelectedCoverFile(file);
    setSaveError(null);

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const removeCover = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedCoverFile(null);
    } else {
      setCoverUrl(null);
    }
  };

  const handleLocationSuccess = async (locationId: number) => {
    await fetchLocations();
    // setLocationId(String(locationId));
    setDrawer(null);
  };

  const handleOrganizerSuccess = async (organizerId: number) => {
    await fetchOrganizers();
    setOrganizerId(String(organizerId));
    setDrawer(null);
  };

  const handleBankInfoSuccess = async (bankInfoId: number) => {
    await fetchBankInfos();
    setBankInfoId(String(bankInfoId));
    setDrawer(null);
  };

  const handleLinePayeeSuccess = async (linePayeeId: number) => {
    await fetchLinePayees();
    setLinePayeeId(String(linePayeeId));
    setDrawer(null);
  };

  const handlePurchaseItemSuccess = (item: PurchaseItemDraft) => {
    setPurchaseItems((prev) => [...prev, item]);
    setDrawer(null);
  };

  // 編輯後取代指定 index 的項目（草稿本地取代；已存項目由抽屜先打 API 再回傳新值）
  const handlePurchaseItemUpdated = (index: number, item: PurchaseItemDraft) => {
    setPurchaseItems((prev) => prev.map((row, i) => (i === index ? item : row)));
    setDrawer(null);
    setEditingItemIndex(null);
  };

  // 套用某類型範本：以範本覆寫時段／群組／項目／互斥（create 模式換類型用，會蓋掉現有 draft）
  const applyTemplate = useCallback(
    (nextType: EventType) => {
      const tpl = getEventTemplate(nextType, (key) => tTemplates(key));
      setPriceTiers(tpl.priceTiers);
      setGroups(tpl.groups);
      setPurchaseItems(tpl.purchaseItems);
      setGroupExclusions(tpl.groupExclusions);
    },
    [tTemplates]
  );

  const handleNoticeItemSuccess = (item: NoticeItemDraft) => {
    setNoticeItems((prev) => [...prev, item]);
    setDrawer(null);
  };

  // 刪除購買項目：草稿直接本地移除；已儲存且零報名時呼叫後端刪除（後端會再次把關）
  const deletePurchaseItem = async (index: number) => {
    const item = purchaseItems[index];
    if (item.id == null) {
      setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (mode !== "edit" || eventId == null) return;
    setPurchaseItemDeletingIndex(index);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-items/${item.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || t("errors.deleteItemFailed"));
        return;
      }
      setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
    } catch {
      setSaveError(t("errors.deleteItemFailed"));
    } finally {
      setPurchaseItemDeletingIndex(null);
    }
  };

  const removeNoticeItem = (index: number) => {
    const item = noticeItems[index];
    if (item.id != null) return;
    setNoticeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const setPurchaseItemHidden = async (index: number, hidden: boolean) => {
    const item = purchaseItems[index];
    if (item.id == null) {
      setPurchaseItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, hidden } : row))
      );
      return;
    }
    if (mode !== "edit" || eventId == null) return;
    setPurchaseItemHiddenUpdatingIndex(index);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hidden }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || t("errors.updateItemFailed"));
        return;
      }
      setPurchaseItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, hidden } : row))
      );
    } catch {
      setSaveError(t("errors.updateItemFailed"));
    } finally {
      setPurchaseItemHiddenUpdatingIndex(null);
    }
  };

  // 把項目指派到票券區塊（groupKey 為 `id-<id>` / `draft-<index>`；空字串 = 取消指派）
  const assignItemGroup = async (index: number, groupKey: string) => {
    const item = purchaseItems[index];
    if (!item) return;
    let groupId: number | null = null;
    let groupDraftIndex: number | undefined;
    if (groupKey.startsWith("id-")) groupId = Number(groupKey.slice(3));
    else if (groupKey.startsWith("draft-")) groupDraftIndex = Number(groupKey.slice(6));
    const applyLocal = () =>
      setPurchaseItems((prev) =>
        prev.map((row, i) =>
          i === index ? { ...row, groupId, groupDraftIndex } : row
        )
      );
    if (item.id == null || mode !== "edit" || eventId == null) {
      applyLocal();
      return;
    }
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ groupId }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || t("errors.updateItemFailed"));
        return;
      }
      applyLocal();
    } catch {
      setSaveError(t("errors.updateItemFailed"));
    }
  };

  // autoCalcAmount 位於票券設定分頁（無儲存鈕），edit 模式改動時直接持久化
  const updateAutoCalcAmount = async (value: boolean) => {
    setAutoCalcAmount(value);
    if (mode !== "edit" || eventId == null) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ autoCalcAmount: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || t("errors.updatePurchaseRulesFailed"));
      }
    } catch {
      setSaveError(t("errors.updatePurchaseRulesFailed"));
    }
  };

  // 參加者勾選項目名稱：輸入時只改 state，blur 時（edit 模式）才持久化，避免每個字都打 API
  const saveAttendeeFlagLabel = async () => {
    if (mode !== "edit" || eventId == null) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendeeFlagLabel: attendeeFlagLabel.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || t("errors.updateAttendeeFlagFailed"));
      }
    } catch {
      setSaveError(t("errors.updateAttendeeFlagFailed"));
    }
  };

  // ===== 票價時段 =====

  /**
   * 時段依 sortOrder 升冪解析，取第一個尚未截止的段（`lib/pricing.ts` 的 `resolveActiveTier`），
   * 所以**最後一段必須是唯一沒有截止日的 fallback 段**。排在 fallback 之後的時段永遠輪不到，
   * 新增時段因此一律插在 fallback 之前，而不是接在最後面。
   */
  const fallbackTierIndex = (tiers: PriceTierDraft[]) =>
    tiers.length === 0 ? -1 : tiers.length - 1;

  /** 距今 n 天的台北日期字串（date input 用） */
  const dateInputInDays = (days: number) =>
    taipeiDateInput(new Date(Date.now() + days * 86_400_000).toISOString());

  /**
   * 把 sortOrder 對齊陣列索引。
   *
   * 舊版新增用 `priceTiers.length`、刪除又不重編號，於是刪掉再新增就會出現重複的 sortOrder，
   * 「哪一段生效」變成不確定。這裡在每次增刪後統一重編，順帶修好既有活動已經撞號的資料。
   */
  const renumberPriceTiers = async (next: PriceTierDraft[]) => {
    if (mode !== "edit" || eventId == null) return;
    await Promise.all(
      next.map(async (tier, index) => {
        if (tier.id == null || tier.sortOrder === index) return;
        try {
          await fetch(`/api/events/${eventId}/price-tiers/${tier.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sortOrder: index }),
          });
        } catch {
          setSaveError(t("errors.reorderTiersFailed"));
        }
      })
    );
  };

  /** 新增時段的預設截止日：前一段截止日 + 14 天，沒有前一段就用 30 天後 */
  const defaultEndsAtForInsert = (tiers: PriceTierDraft[], insertAt: number) => {
    const prev = insertAt > 0 ? tiers[insertAt - 1] : undefined;
    if (prev?.endsAt) {
      const prevMs = new Date(`${prev.endsAt}T00:00:00+08:00`).getTime();
      if (!Number.isNaN(prevMs)) {
        return taipeiDateInput(new Date(prevMs + 14 * 86_400_000).toISOString());
      }
    }
    return dateInputInDays(30);
  };

  /**
   * create 模式專用：在 `from` 位置插入時段後，把後面項目價格的 `tierDraftIndex` 往後移。
   * 少了這步，插在中間的時段會讓後面時段的價格默默綁到別段去。
   */
  const shiftTierDraftIndexes = (from: number) => {
    setPurchaseItems((prev) =>
      prev.map((item) => ({
        ...item,
        prices: shiftPricesAfterTierInsert(item.prices ?? [], from),
      }))
    );
  };

  const addPriceTier = async () => {
    // 第一段就是 fallback 段（永不過期）；之後的新增都插在 fallback 之前並帶截止日
    const isFirst = priceTiers.length === 0;
    const insertAt = isFirst ? 0 : fallbackTierIndex(priceTiers);
    const name = isFirst ? tTemplates("door") : t("defaults.newTier");
    const endsAt = isFirst ? "" : defaultEndsAtForInsert(priceTiers, insertAt);

    if (mode === "edit" && eventId != null) {
      try {
        const res = await fetch(`/api/events/${eventId}/price-tiers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, endsAt, sortOrder: insertAt }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || t("errors.addTierFailed"));
          return;
        }
        const next = [...priceTiers];
        next.splice(insertAt, 0, {
          id: data.priceTier?.id,
          name,
          endsAt,
          sortOrder: insertAt,
        });
        setPriceTiers(next.map((t, i) => ({ ...t, sortOrder: i })));
        await renumberPriceTiers(next);
      } catch {
        setSaveError(t("errors.addTierFailed"));
      }
      return;
    }

    setPriceTiers((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, { name, endsAt, sortOrder: insertAt });
      return next.map((t, i) => ({ ...t, sortOrder: i }));
    });
    // create 模式：插在中間會讓後面時段的 draft index 整體後移，項目價格要跟著搬
    if (!isFirst) shiftTierDraftIndexes(insertAt);
  };

  /** 空狀態一鍵建立「早鳥 + 現場」兩段，省得使用者自己拼出合法的時段梯 */
  const seedDefaultPriceTiers = async () => {
    const seeds: { name: string; endsAt: string }[] = [
      { name: tTemplates("earlyBird"), endsAt: dateInputInDays(30) },
      { name: tTemplates("door"), endsAt: "" },
    ];

    if (mode === "edit" && eventId != null) {
      const created: PriceTierDraft[] = [];
      for (const [index, seed] of seeds.entries()) {
        try {
          const res = await fetch(`/api/events/${eventId}/price-tiers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...seed, sortOrder: index }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setSaveError(data.error || t("errors.addTierFailed"));
            break;
          }
          created.push({ id: data.priceTier?.id, ...seed, sortOrder: index });
        } catch {
          setSaveError(t("errors.addTierFailed"));
          break;
        }
      }
      if (created.length > 0) setPriceTiers(created);
      return;
    }

    setPriceTiers(seeds.map((seed, index) => ({ ...seed, sortOrder: index })));
  };

  const updatePriceTier = (
    index: number,
    field: "name" | "endsAt",
    value: string
  ) => {
    setPriceTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  // edit 模式：欄位失焦時把該時段變更存回後端
  const persistPriceTier = async (index: number) => {
    if (mode !== "edit" || eventId == null) return;
    const tier = priceTiers[index];
    if (tier?.id == null) return;
    try {
      const res = await fetch(`/api/events/${eventId}/price-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: tier.name, endsAt: tier.endsAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSaveError(data.error || t("errors.updateTierFailed"));
    } catch {
      setSaveError(t("errors.updateTierFailed"));
    }
  };

  const removePriceTier = async (index: number) => {
    const tier = priceTiers[index];
    if (mode === "edit" && eventId != null && tier?.id != null) {
      try {
        const res = await fetch(
          `/api/events/${eventId}/price-tiers/${tier.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || t("errors.deleteTierFailed"));
          return;
        }
      } catch {
        setSaveError(t("errors.deleteTierFailed"));
        return;
      }
    }
    // remaining 保留原本的 sortOrder，renumberPriceTiers 才看得出哪幾段需要改；
    // 先 normalize 再傳進去的話 `tier.sortOrder === index` 永遠成立，一筆都不會送出
    const remaining = priceTiers.filter((_, i) => i !== index);
    setPriceTiers(remaining.map((t, i) => ({ ...t, sortOrder: i })));

    // 同步移除本地草稿項目中參照到此時段的價格，並把後面的 tierDraftIndex 往前移一格
    setPurchaseItems((prev) =>
      prev.map((item) => ({
        ...item,
        prices: remapPricesAfterTierRemoval(item.prices ?? [], index, tier?.id),
      }))
    );

    await renumberPriceTiers(remaining);
  };

  // ===== 票種群組 =====
  const addGroup = async () => {
    const sortOrder = groups.length;
    const groupTitle = t("defaults.newGroup");
    if (mode === "edit" && eventId != null) {
      try {
        const res = await fetch(`/api/events/${eventId}/purchase-item-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: groupTitle,
            selectionMode: "single",
            required: true,
            sortOrder,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || t("errors.addGroupFailed"));
          return;
        }
        setGroups((prev) => [
          ...prev,
          {
            id: data.group?.id,
            title: groupTitle,
            selectionMode: "single",
            required: true,
            sortOrder,
          },
        ]);
      } catch {
        setSaveError(t("errors.addGroupFailed"));
      }
      return;
    }
    setGroups((prev) => [
      ...prev,
      { title: groupTitle, selectionMode: "single", required: true, sortOrder },
    ]);
  };

  const updateGroup = <K extends keyof PurchaseItemGroupDraft>(
    index: number,
    field: K,
    value: PurchaseItemGroupDraft[K]
  ) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  // edit 模式：欄位變更時把該群組存回後端。
  // override：緊接著 updateGroup 呼叫時 state 尚未更新，用它帶入最新值
  const persistGroup = async (
    index: number,
    override?: Partial<PurchaseItemGroupDraft>
  ) => {
    if (mode !== "edit" || eventId == null) return;
    const base = groups[index];
    if (base?.id == null) return;
    const group = { ...base, ...override };
    try {
      const res = await fetch(
        `/api/events/${eventId}/purchase-item-groups/${group.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: group.title,
            selectionMode: group.selectionMode,
            required: group.required,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSaveError(data.error || t("errors.updateGroupFailed"));
    } catch {
      setSaveError(t("errors.updateGroupFailed"));
    }
  };

  const removeGroup = async (index: number) => {
    const group = groups[index];
    if (mode === "edit" && eventId != null && group?.id != null) {
      try {
        const res = await fetch(
          `/api/events/${eventId}/purchase-item-groups/${group.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || t("errors.deleteGroupFailed"));
          return;
        }
      } catch {
        setSaveError(t("errors.deleteGroupFailed"));
        return;
      }
    }
    setGroups((prev) =>
      prev.filter((_, i) => i !== index).map((g, i) => ({ ...g, sortOrder: i }))
    );
    // 同步清掉本地項目對此群組的歸屬。
    // 後面群組的 draft index 會整體前移一格，項目的 groupDraftIndex 要跟著搬，
    // 否則 create 模式刪掉中間的群組會讓後面的票券默默歸到別的區塊。
    setPurchaseItems((prev) =>
      prev.map((item) => {
        if (
          item.groupDraftIndex === index ||
          (group?.id != null && item.groupId === group.id)
        ) {
          return { ...item, groupId: null, groupDraftIndex: undefined };
        }
        if (item.groupDraftIndex != null && item.groupDraftIndex > index) {
          return { ...item, groupDraftIndex: item.groupDraftIndex - 1 };
        }
        return item;
      })
    );
    // 同步移除任何指向此群組的互斥配對；剩下的 `draft-<index>` key 一併前移
    const removedKey = group?.id != null ? `id-${group.id}` : `draft-${index}`;
    const shiftKey = (key: string) => {
      if (!key.startsWith("draft-")) return key;
      const n = Number(key.slice(6));
      return Number.isInteger(n) && n > index ? `draft-${n - 1}` : key;
    };
    setGroupExclusions((prev) => {
      const next = prev
        .filter((p) => p[0] !== removedKey && p[1] !== removedKey)
        .map(([a, b]): [string, string] => [shiftKey(a), shiftKey(b)]);
      if (next.length !== prev.length) void persistGroupExclusions(next);
      return next;
    });
  };

  // ---- 群組互斥（Phase 2.5）----
  const samePair = (p: [string, string], a: string, b: string) =>
    (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

  const isGroupExcluded = (keyA: string, keyB: string) =>
    groupExclusions.some((p) => samePair(p, keyA, keyB));

  // edit 模式：把互斥配對（僅含已存檔群組的 `id-` key）整批 PUT 回後端
  const persistGroupExclusions = async (pairs: Array<[string, string]>) => {
    if (mode !== "edit" || eventId == null) return;
    await trackAutoSave(persistGroupExclusionsRequest(pairs));
  };

  const persistGroupExclusionsRequest = async (pairs: Array<[string, string]>) => {
    if (mode !== "edit" || eventId == null) return;
    const exclusions = pairs
      .map(([a, b]) => {
        const ga = a.startsWith("id-") ? Number(a.slice(3)) : NaN;
        const gb = b.startsWith("id-") ? Number(b.slice(3)) : NaN;
        return Number.isInteger(ga) && Number.isInteger(gb)
          ? { groupAId: ga, groupBId: gb }
          : null;
      })
      .filter((x): x is { groupAId: number; groupBId: number } => x != null);
    try {
      const res = await fetch(`/api/events/${eventId}/group-exclusions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ exclusions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || t("errors.updateExclusionsFailed"));
      }
    } catch {
      setSaveError(t("errors.updateExclusionsFailed"));
    }
  };

  const toggleGroupExclusion = (keyA: string, keyB: string) => {
    setGroupExclusions((prev) => {
      const exists = prev.some((p) => samePair(p, keyA, keyB));
      const next: Array<[string, string]> = exists
        ? prev.filter((p) => !samePair(p, keyA, keyB))
        : [...prev, [keyA, keyB]];
      void persistGroupExclusions(next);
      return next;
    });
  };

  // ===== 折扣碼 =====
  const addCoupon = () => {
    // 折扣碼需要使用者輸入有效內容才有意義，兩種模式都先加本地草稿，
    // edit 模式由 persistCoupon 於欄位失焦時建立/更新後端資料
    setCoupons((prev) => [
      ...prev,
      { code: "", discountType: "fixed", value: "", usageLimit: "" },
    ]);
  };

  const updateCoupon = <K extends keyof CouponDraft>(
    index: number,
    field: K,
    value: CouponDraft[K]
  ) => {
    setCoupons((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const couponPayload = (c: CouponDraft) => ({
    code: c.code,
    discountType: c.discountType,
    value: Number(c.value),
    usageLimit: c.usageLimit.trim() === "" ? null : Number(c.usageLimit),
  });

  const isCouponComplete = (c: CouponDraft) =>
    c.code.trim() !== "" && Number.isInteger(Number(c.value)) && Number(c.value) >= 1;

  // edit 模式：欄位失焦時把該折扣碼存回後端（草稿列填齊 code + value 才建立）。
  // override：緊接著 updateCoupon 呼叫時 state 尚未更新，用它帶入最新值
  const persistCoupon = async (index: number, override?: Partial<CouponDraft>) => {
    if (mode !== "edit" || eventId == null) return;
    const base = coupons[index];
    const coupon = base ? { ...base, ...override } : undefined;
    if (!coupon || !isCouponComplete(coupon)) return;
    try {
      const res = await fetch(
        coupon.id == null
          ? `/api/events/${eventId}/coupons`
          : `/api/events/${eventId}/coupons/${coupon.id}`,
        {
          method: coupon.id == null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(couponPayload(coupon)),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || t("errors.saveCouponFailed"));
        return;
      }
      setSaveError(null);
      const saved = data.coupon;
      if (saved?.id != null) {
        setCoupons((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  id: saved.id,
                  code: saved.code,
                  usedCount: saved.usedCount ?? c.usedCount ?? 0,
                }
              : c
          )
        );
      }
    } catch {
      setSaveError(t("errors.saveCouponFailed"));
    }
  };

  const removeCoupon = async (index: number) => {
    const coupon = coupons[index];
    if (mode === "edit" && eventId != null && coupon?.id != null) {
      try {
        const res = await fetch(`/api/events/${eventId}/coupons/${coupon.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveError(data.error || t("errors.deleteCouponFailed"));
          return;
        }
      } catch {
        setSaveError(t("errors.deleteCouponFailed"));
        return;
      }
    }
    setCoupons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError(t("validation.titleRequired"));
      return;
    }
    if (!locationId || !locationId.trim()) {
      setSaveError(t("validation.locationRequired"));
      return;
    }
    if (!organizerId || !organizerId.trim()) {
      setSaveError(t("validation.organizerRequired"));
      return;
    }
    if (!bankInfoId || !bankInfoId.trim()) {
      setSaveError(t("validation.bankInfoRequired"));
      return;
    }
    setSaving(true);
    try {
      let finalCoverUrl = coverUrl;
      if (selectedCoverFile) {
        try {
          const uploadResult = await startCoverUpload([selectedCoverFile]);
          if (!uploadResult || uploadResult.length === 0) {
            throw new Error(t("errors.uploadFailed"));
          }
          const first = uploadResult[0];
          finalCoverUrl =
            first &&
            ("url" in first
              ? first.url
              : (first as { ufsUrl?: string }).ufsUrl) ||
            null;
          if (!finalCoverUrl) {
            throw new Error(t("errors.uploadUrlMissing"));
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          setSaveError(
            uploadError instanceof Error ? uploadError.message : t("errors.coverUploadFailed")
          );
          setSaving(false);
          return;
        }
      }
      if (mode === "edit" && eventId != null) {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type,
            title: trimmedTitle,
            description: description.trim() || null,
            coverUrl: finalCoverUrl || null,
            startAt: datetimeLocalToISO(startAt),
            endAt: datetimeLocalToISO(endAt),
            locationId: Number(locationId),
            organizerId: Number(organizerId),
            bankInfoId: Number(bankInfoId),
            linePayeeId: linePayeeId ? Number(linePayeeId) : null,
            allowMultiplePurchase: allowMultiple,
            autoCalcAmount: autoCalcAmount,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || t("errors.updateFailed"));
          setSaving(false);
          return;
        }
        setBasicDirty(false);
        onSaveSuccess?.();
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            teamId,
            type,
            title: trimmedTitle,
            description: description.trim() || undefined,
            coverUrl: finalCoverUrl || undefined,
            startAt: datetimeLocalToISO(startAt),
            endAt: datetimeLocalToISO(endAt),
            locationId: Number(locationId),
            organizerId: Number(organizerId),
            bankInfoId: Number(bankInfoId),
            linePayeeId: linePayeeId ? Number(linePayeeId) : null,
            allowMultiplePurchase: allowMultiple,
            autoCalcAmount: autoCalcAmount,
            attendeeFlagLabel: attendeeFlagLabel.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || t("errors.saveFailed"));
          setSaving(false);
          return;
        }
        const newEventId = data.event?.id;
        if (newEventId != null) {
          // 用精靈建立（而且之後沒在進階模式改過）：票券整包交給伺服器依答案建立；
          // 失敗才退回下面逐筆送草稿的舊流程
          const appliedPlan =
            ticketPlan != null && ticketPlanInSync
              ? await putTicketPlan(newEventId, ticketPlan).then(
                  () => true,
                  () => false
                )
              : false;
          const draftGroups = appliedPlan ? [] : groups;
          const draftExclusions = appliedPlan ? [] : groupExclusions;
          const draftTiers = appliedPlan ? [] : priceTiers;
          const draftItems = appliedPlan ? [] : purchaseItems;
          const draftCoupons = appliedPlan ? [] : coupons;

          // 先建立群組，取得 draftIndex → 真實 groupId 的對照
          const groupIdByDraftIndex = new Map<number, number>();
          for (let i = 0; i < draftGroups.length; i++) {
            const group = draftGroups[i];
            const gRes = await fetch(
              `/api/events/${newEventId}/purchase-item-groups`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  title: group.title,
                  selectionMode: group.selectionMode,
                  required: group.required,
                  sortOrder: i,
                }),
              }
            );
            const gData = await gRes.json().catch(() => ({}));
            if (gRes.ok && gData.group?.id != null) {
              groupIdByDraftIndex.set(i, gData.group.id);
            }
          }

          // 群組互斥：把 key（`draft-<index>`）解析成真實 groupId 後整批寫入
          const resolveExclusionKey = (key: string): number | null => {
            if (key.startsWith("id-")) return Number(key.slice(3));
            if (key.startsWith("draft-"))
              return groupIdByDraftIndex.get(Number(key.slice(6))) ?? null;
            return null;
          };
          const exclusionPayload = draftExclusions
            .map(([a, b]) => {
              const ga = resolveExclusionKey(a);
              const gb = resolveExclusionKey(b);
              return ga != null && gb != null ? { groupAId: ga, groupBId: gb } : null;
            })
            .filter((x): x is { groupAId: number; groupBId: number } => x != null);
          if (exclusionPayload.length > 0) {
            await fetch(`/api/events/${newEventId}/group-exclusions`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ exclusions: exclusionPayload }),
            });
          }

          // 再建立時段，取得 draftIndex → 真實 tierId 的對照
          const tierIdByDraftIndex = new Map<number, number>();
          for (let i = 0; i < draftTiers.length; i++) {
            const tier = draftTiers[i];
            const tRes = await fetch(`/api/events/${newEventId}/price-tiers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: tier.name,
                endsAt: tier.endsAt || null,
                sortOrder: i,
              }),
            });
            const tData = await tRes.json().catch(() => ({}));
            if (tRes.ok && tData.priceTier?.id != null) {
              tierIdByDraftIndex.set(i, tData.priceTier.id);
            }
          }

          for (let i = 0; i < draftItems.length; i++) {
            const item = draftItems[i];
            const prices = (item.prices ?? [])
              .map((p) => {
                const tierId =
                  p.tierId ??
                  (p.tierDraftIndex != null
                    ? tierIdByDraftIndex.get(p.tierDraftIndex)
                    : undefined);
                return tierId != null
                  ? { tierId, amount: p.amount, available: p.available !== false }
                  : null;
              })
              .filter(
                (p): p is { tierId: number; amount: number; available: boolean } =>
                  p !== null
              );
            const groupId =
              item.groupId ??
              (item.groupDraftIndex != null
                ? groupIdByDraftIndex.get(item.groupDraftIndex) ?? null
                : null);
            await fetch(`/api/events/${newEventId}/purchase-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: item.name,
                amount: item.amount,
                sortOrder: i,
                hidden: item.hidden === true,
                groupId,
                seatCount: item.seatCount ?? 1,
                description: item.description ?? null,
                minFlagged: item.minFlagged ?? 0,
                prices,
              }),
            });
          }
          for (let i = 0; i < noticeItems.length; i++) {
            await fetch(`/api/events/${newEventId}/notice-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                content: noticeItems[i].content,
                sortOrder: i,
              }),
            });
          }
          for (const coupon of draftCoupons) {
            if (!isCouponComplete(coupon)) continue;
            await fetch(`/api/events/${newEventId}/coupons`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(couponPayload(coupon)),
            });
          }
        }
        window.location.href = "/events";
      }
    } catch {
      setSaveError(mode === "edit" ? t("errors.updateFailed") : t("errors.saveFailed"));
    }
    setSaving(false);
  };

  return {
    // State reads
    drawer,
    type,
    allowMultiple,
    autoCalcAmount,
    attendeeFlagLabel,
    locationId,
    organizerId,
    bankInfoId,
    linePayeeId,
    locations,
    organizers,
    bankInfos,
    linePayees,
    title,
    description,
    startAt,
    endAt,
    coverUrl,
    previewUrl,
    isUploadingCover,
    purchaseItems,
    purchaseItemHiddenUpdatingIndex,
    purchaseItemDeletingIndex,
    editingItemIndex,
    adderDefaultGroupKey,
    priceTiers,
    groups,
    groupExclusions,
    noticeItems,
    coupons,
    ticketPlan,
    ticketPlanInSync,
    saveError,
    saving,
    autoSaveStatus,
    basicDirty,
    // Simple setters（基本資訊欄位包 dirty 追蹤）
    setType: markBasicDirty(setType),
    applyTemplate,
    setTitle: markBasicDirty(setTitle),
    setDescription: markBasicDirty(setDescription),
    setEndAt: markBasicDirty(setEndAt),
    setLocationId: markBasicDirty(setLocationId),
    setOrganizerId: markBasicDirty(setOrganizerId),
    setBankInfoId: markBasicDirty(setBankInfoId),
    setLinePayeeId: markBasicDirty(setLinePayeeId),
    setAllowMultiple: markBasicDirty(setAllowMultiple),
    setAutoCalcAmount: withAutoSave(updateAutoCalcAmount),
    setAttendeeFlagLabel,
    saveAttendeeFlagLabel: withAutoSave(saveAttendeeFlagLabel),
    // Handlers
    handleStartAtChange: markBasicDirty(handleStartAtChange),
    handleFileSelect: markBasicDirty(handleFileSelect),
    removeCover: markBasicDirty(removeCover),
    openDrawer,
    closeDrawer,
    handleLocationSuccess,
    handleOrganizerSuccess,
    handleBankInfoSuccess,
    handleLinePayeeSuccess,
    handlePurchaseItemSuccess,
    handlePurchaseItemUpdated,
    openPurchaseItemAdder,
    openPurchaseItemEditor,
    handleNoticeItemSuccess,
    removeNoticeItem,
    // 票券設定 mutators（edit 模式自動儲存，包狀態追蹤）
    deletePurchaseItem: withAutoSave(deletePurchaseItem),
    setPurchaseItemHidden: withAutoSave(setPurchaseItemHidden),
    assignItemGroup: withAutoSave(assignItemGroup),
    addPriceTier: withAutoSave(addPriceTier),
    seedDefaultPriceTiers: withAutoSave(seedDefaultPriceTiers),
    updatePriceTier,
    persistPriceTier: withAutoSave(persistPriceTier),
    removePriceTier: withAutoSave(removePriceTier),
    addGroup: withAutoSave(addGroup),
    updateGroup,
    persistGroup: withAutoSave(persistGroup),
    removeGroup: withAutoSave(removeGroup),
    isGroupExcluded,
    toggleGroupExclusion,
    addCoupon,
    updateCoupon,
    persistCoupon: withAutoSave(persistCoupon),
    removeCoupon: withAutoSave(removeCoupon),
    // 售票精靈
    applyTicketPlan,
    refreshTicketPlanSync,
    handleSubmit,
  };
}

export type UseEventFormReturn = ReturnType<typeof useEventForm>;
