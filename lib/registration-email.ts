import { db } from "@/db";
import { eventLocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { asLocale } from "@/lib/locale";

/** 寄確認信需要的活動欄位（events 表的子集） */
export type ConfirmationEmailEvent = {
  title: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  locationId: number | null;
};

/** 同一場活動的共用資料，查一次就好 */
export type ConfirmationEmailContext = {
  title?: string;
  startAt?: string;
  endAt?: string;
  location: { name: string; googleMapUrl: string | null } | null;
};

/**
 * 準備寄確認信所需的活動資訊。
 * 批次確認收款時一次算好、每封信共用，避免 N 次地點查詢。
 */
export async function loadConfirmationEmailContext(
  event: ConfirmationEmailEvent
): Promise<ConfirmationEmailContext> {
  let location: { name: string; googleMapUrl: string | null } | null = null;

  if (event.locationId) {
    const [loc] = await db
      .select({
        name: eventLocations.name,
        googleMapUrl: eventLocations.googleMapUrl,
      })
      .from(eventLocations)
      .where(eq(eventLocations.id, event.locationId))
      .limit(1);
    if (loc) {
      location = { name: loc.name, googleMapUrl: loc.googleMapUrl ?? null };
    }
  }

  return {
    title: event.title ?? undefined,
    startAt: event.startAt ? new Date(event.startAt).toISOString() : undefined,
    endAt: event.endAt ? new Date(event.endAt).toISOString() : undefined,
    location,
  };
}

/**
 * 用準備好的 context 寄一封收款確認信。不會 throw，失敗以回傳值表示。
 * `locale` 傳報名當下存下來的 event_registrations.locale，信用報名者的語言寫。
 */
export async function sendConfirmationEmail(
  ctx: ConfirmationEmailContext,
  to: string,
  registrationKey: string,
  locale: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await sendPaymentConfirmedEmail({
      to,
      registrationKey,
      locale: asLocale(locale),
      eventTitle: ctx.title,
      eventStartAt: ctx.startAt,
      eventEndAt: ctx.endAt,
      eventLocation: ctx.location,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "寄信失敗";
    console.error("sendConfirmationEmail error:", error);
    return { ok: false, error };
  }
}
