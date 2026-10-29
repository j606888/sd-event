"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { formatDate } from "@/lib/format-event-date";
import { isOnSale, PAYMENT_KINDS, type SavedInfoKind, type UsingEvent } from "@/lib/saved-info";
import type { Locale } from "@/lib/locale";

type DeleteSavedInfoDrawerProps = {
  open: boolean;
  onClose: () => void;
  kind: SavedInfoKind;
  /** 列表上顯示的名稱，放進標題 */
  name: string;
  /** 列表 API 回傳的 usedBy */
  usedBy: UsingEvent<string>[];
  deleteUrl: string;
  onDeleted: () => void;
};

/**
 * 刪除常用資訊的確認視窗。
 * - 沒活動在用：一般確認
 * - 有活動在用：列出活動並說明刪了會少什麼，確認後可刪
 * - 付款資訊被正在報名的活動使用：擋下，請先幫活動換掉（後端也會再擋一次並回 409）
 */
export function DeleteSavedInfoDrawer({
  open,
  onClose,
  kind,
  name,
  usedBy,
  deleteUrl,
  onDeleted,
}: DeleteSavedInfoDrawerProps) {
  const t = useTranslations("savedInfo.delete");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverBlocking, setServerBlocking] = useState<UsingEvent<string>[] | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setServerBlocking(null);
    }
  }, [open]);

  const blocking =
    serverBlocking ??
    (PAYMENT_KINDS.includes(kind) ? usedBy.filter((event) => isOnSale(event)) : []);
  const blocked = blocking.length > 0;

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.blockingEvents)) {
        setServerBlocking(data.blockingEvents);
        return;
      }
      if (!res.ok) {
        setError(data.error || t("failed"));
        return;
      }
      onDeleted();
      onClose();
    } catch {
      setError(t("failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (event: UsingEvent<string>) =>
    isOnSale(event)
      ? t("status.onSale")
      : event.status === "draft"
        ? t("status.draft")
        : t("status.ended");

  const eventList = (list: UsingEvent<string>[], withLink: boolean) => (
    <ul className="divide-y divide-hairline rounded-lg border border-hairline">
      {list.map((event) => (
        <li key={event.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{event.title}</p>
            <p className="text-xs text-muted-ink">
              {formatDate(event.startAt, locale)} · {statusLabel(event)}
            </p>
          </div>
          {withLink && (
            <Link
              href={`/events/${event.id}?tab=basic`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-strong hover:bg-brand/20"
            >
              {t("goChange")}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  if (blocked) {
    return (
      <Drawer open={open} onClose={onClose} title={t("blockedTitle", { name })}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            {kind === "linePayee" ? t("blocked.linePayee") : t("blocked.bankInfo")}
          </p>
          {eventList(blocking, true)}
          <p className="text-xs text-muted-ink">{t("blockedHint")}</p>
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            {t("gotIt")}
          </Button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={onClose} title={t("title", { name })}>
      <div className="space-y-4">
        {usedBy.length > 0 ? (
          <>
            <p className="text-sm text-gray-600">{t("usedBy", { count: usedBy.length })}</p>
            {eventList(usedBy, false)}
            <p className="text-sm leading-relaxed text-gray-600">{t(`effect.${kind}`)}</p>
            <p className="text-xs text-muted-ink">{t("irreversible")}</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-gray-600">{t("unused")}</p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={submitting}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
            disabled={submitting}
            onClick={handleDelete}
          >
            {submitting ? t("deleting") : t("confirm")}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
