import { Resend } from "resend";
import { createTranslator } from "next-intl";
import {
  formatSessionDay,
  formatSessionTimeRange,
  getEventDateLabel,
  getEventTimeRange,
} from "@/lib/format-event-date";
import { buildItemSchedule, hasItemSchedule, type SchedulableItem } from "@/lib/item-schedule";
import type { Locale } from "@/lib/locale";
import type { AssignableTeamRole } from "@/lib/team-roles";
import zhTW from "@/messages/zh-TW";
import en from "@/messages/en";

const apiKey = process.env.RESEND_API_KEY;
const from =
  process.env.EMAIL_FROM ?? "SD Event <noreply@sd-event.j606888.com>";
const siteUrl = process.env.SITE_URL ?? "https://sd-event.vercel.app";

const resend = apiKey ? new Resend(apiKey) : null;

const MESSAGES: Record<Locale, typeof zhTW> = { "zh-TW": zhTW, en };

/**
 * 信件文案在 messages/<locale>/emails.json。語系是「收件人」的語言，不是觸發寄信的人：
 * 寄給報名者用報名當下的語言（event_registrations.locale），寄給團隊成員用 users.locale。
 */
function emailTranslator(locale: Locale) {
  return createTranslator({ locale, messages: MESSAGES[locale] });
}

/** 文案裡的 <strong> 標籤 */
const strong = (chunks: string) => `<strong>${chunks}</strong>`;

function registrationSuccessUrl(registrationKey: string): string {
  return `${siteUrl}/registration-success/${registrationKey}`;
}

/**
 * Send email when user successfully applies for an event.
 * Contains link to view registration status.
 */
export async function sendRegistrationSuccessEmail({
  to,
  registrationKey,
  eventTitle,
  locale,
}: {
  to: string;
  registrationKey: string;
  eventTitle?: string;
  locale: Locale;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping registration success email");
    return { ok: false, error: "Email not configured" };
  }

  const t = emailTranslator(locale);
  const e = escapeHtml;
  const url = registrationSuccessUrl(registrationKey);
  const subject = eventTitle
    ? t("emails.registrationReceived.subject", { event: eventTitle })
    : t("emails.registrationReceived.subjectNoEvent");

  const html = `
    <p>${t("emails.greeting")}</p>
    <p>${eventTitle ? t("emails.registrationReceived.thanks", { event: e(eventTitle) }) : t("emails.registrationReceived.thanksNoEvent")}</p>
    <p>${t("emails.registrationReceived.intro")}</p>
    <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.registrationReceived.cta")}</a></p>
    <p><strong>${t("emails.registrationReceived.noticeTitle")}</strong></p>
    <ul>
      <li>${t("emails.registrationReceived.noticePay")}</li>
      <li>${t("emails.registrationReceived.noticeReport")}</li>
    </ul>
    <p>${t("emails.registrationReceived.closing")}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.signature")}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend sendRegistrationSuccessEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}

/**
 * Send email when creator confirms payment.
 * Contains same link to view registration status.
 */
export async function sendPaymentConfirmedEmail({
  to,
  registrationKey,
  locale,
  eventTitle,
  eventStartAt,
  eventEndAt,
  eventLocation,
  scheduleItems = [],
}: {
  to: string;
  registrationKey: string;
  locale: Locale;
  eventTitle?: string;
  eventStartAt?: string;
  eventEndAt?: string;
  eventLocation?: { id?: number; name: string; googleMapUrl: string | null } | null;
  /** 這筆報名買到的票各自的上課時間與場地；有設時多一段「你的課程」 */
  scheduleItems?: SchedulableItem[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping payment confirmed email");
    return { ok: false, error: "Email not configured" };
  }

  const t = emailTranslator(locale);
  const e = escapeHtml;
  const entryVoucherUrl = `${siteUrl}/entry-voucher/${registrationKey}`;
  const subject = eventTitle
    ? t("emails.paymentConfirmed.subject", { event: eventTitle })
    : t("emails.paymentConfirmed.subjectNoEvent");

  // Format event time (uses same helpers as UI for consistent timezone)
  const eventTimeText =
    eventStartAt && eventEndAt
      ? `${getEventDateLabel(eventStartAt, eventEndAt, locale)} ${getEventTimeRange(eventStartAt, eventEndAt)}`
      : "";
  const locationHtml = eventLocation
    ? eventLocation.googleMapUrl
      ? `<a href="${e(eventLocation.googleMapUrl)}">${e(eventLocation.name)}</a>`
      : e(eventLocation.name)
    : "";

  const scheduleHtml = renderScheduleHtml(scheduleItems, eventLocation ?? null, locale, t);
  // 每張票都有自己的場地時，活動場地不適用，只列「你的課程」
  const showEventLocation =
    !!eventLocation &&
    !(scheduleItems.length > 0 && scheduleItems.every((i) => i.location != null));

  const html = `
    <p>${t("emails.greeting")}</p>
    <p>${t("emails.paymentConfirmed.body")}</p>
    <p>${t("emails.paymentConfirmed.voucherIntro")}</p>
    <p><a href="${entryVoucherUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.paymentConfirmed.cta")}</a></p>
    ${eventTimeText || eventLocation ? `
    <p><strong>${t("emails.paymentConfirmed.infoTitle")}</strong></p>
    <ul>
      ${eventTimeText ? `<li>${t("emails.paymentConfirmed.time", { time: eventTimeText })}</li>` : ""}
      ${showEventLocation ? `<li>${t("emails.paymentConfirmed.location", { location: locationHtml })}</li>` : ""}
    </ul>
    ` : ""}
    ${scheduleHtml}
    <p>${t("emails.paymentConfirmed.contact")}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.signature")}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend sendPaymentConfirmedEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}

/** 確認信的「你的課程」：依日期分組，每天列各堂與場地（附地圖連結） */
function renderScheduleHtml(
  items: SchedulableItem[],
  eventLocation: { id?: number; name: string; googleMapUrl: string | null } | null,
  locale: Locale,
  t: ReturnType<typeof emailTranslator>
): string {
  if (!hasItemSchedule(items)) return "";
  const e = escapeHtml;
  const fallback =
    eventLocation && eventLocation.id != null
      ? { id: eventLocation.id, name: eventLocation.name, address: null, googleMapUrl: eventLocation.googleMapUrl }
      : null;
  const days = buildItemSchedule(items, fallback);
  const rows = days
    .flatMap((day) =>
      day.venues.map((venue) => {
        const dayLabel = day.startAt
          ? formatSessionDay(day.startAt, locale)
          : t("emails.paymentConfirmed.scheduleUndated");
        const classes = venue.entries
          .map((entry) =>
            entry.startAt && entry.endAt
              ? `${formatSessionTimeRange(entry.startAt, entry.endAt)} ${e(entry.name)}`
              : e(entry.name)
          )
          .join(t("emails.paymentConfirmed.scheduleSeparator"));
        const loc = venue.location;
        const venueHtml = loc
          ? `・${loc.googleMapUrl ? `<a href="${e(loc.googleMapUrl)}">${e(loc.name)}</a>` : e(loc.name)}`
          : "";
        return `<li><strong>${e(dayLabel)}</strong> ${classes}${venueHtml}</li>`;
      })
    )
    .join("");
  return `<p><strong>${t("emails.paymentConfirmed.scheduleTitle")}</strong></p><ul>${rows}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type NewRegistrationNotification = {
  eventId: number;
  eventTitle: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  attendees: { name: string; role: string }[];
  itemNames: string[];
  tierName: string | null;
  paymentMethod: string | null;
  totalAmount: number | null;
  couponCode: string | null;
  discountAmount: number | null;
};

/**
 * 有新的線上報名時，通知有開啟「新報名通知信」的團隊管理員。
 * 每位收件者各寄一封，避免管理員之間互相看到 email；內容用各自的介面語言。
 */
export async function sendNewRegistrationNotificationEmail(
  recipients: { email: string; locale: Locale }[],
  n: NewRegistrationNotification
): Promise<{ ok: boolean; error?: string }> {
  if (recipients.length === 0) return { ok: true };
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping new registration notification email");
    return { ok: false, error: "Email not configured" };
  }

  const render = (locale: Locale) => {
    const t = emailTranslator(locale);
    const e = escapeHtml;
    const title = n.eventTitle ?? t("emails.newRegistration.eventFallback");
    const subject = t("emails.newRegistration.subject", { event: title, name: n.contactName });
    const manageUrl = `${siteUrl}/events/${n.eventId}`;

    const roleLabel = (role: string) =>
      role === "Leader" || role === "Follower"
        ? t(`enums.role.${role}`)
        : role === "Not sure"
          ? t("enums.role.notSure")
          : role;
    const attendeesHtml = n.attendees
      .map(
        (a) =>
          `<li>${t("emails.newRegistration.attendee", { name: e(a.name), role: e(roleLabel(a.role)) })}</li>`
      )
      .join("");
    const itemsText =
      n.itemNames.length > 0
        ? n.itemNames.map(e).join(t("emails.newRegistration.itemSeparator"))
        : "—";
    const amount = n.totalAmount?.toLocaleString("en-US");
    const amountText =
      amount == null
        ? "—"
        : !n.couponCode
          ? `NT$ ${amount}`
          : n.discountAmount
            ? t("emails.newRegistration.amountWithCouponDiscount", {
                amount,
                code: e(n.couponCode),
                discount: n.discountAmount.toLocaleString("en-US"),
              })
            : t("emails.newRegistration.amountWithCoupon", { amount, code: e(n.couponCode) });

    const html = `
    <p>${t("emails.newRegistration.intro", { event: e(title) })}</p>
    <ul>
      <li>${t("emails.newRegistration.contact", { value: e(n.contactName) })}</li>
      ${n.contactPhone ? `<li>${t("emails.newRegistration.phone", { value: e(n.contactPhone) })}</li>` : ""}
      ${n.contactEmail ? `<li>${t("emails.newRegistration.email", { value: e(n.contactEmail) })}</li>` : ""}
      <li>${n.tierName ? t("emails.newRegistration.ticketsWithTier", { items: itemsText, tier: e(n.tierName) }) : t("emails.newRegistration.tickets", { items: itemsText })}</li>
      <li>${t("emails.newRegistration.amount", { amount: amountText })}</li>
      ${n.paymentMethod ? `<li>${t("emails.newRegistration.paymentMethod", { value: e(n.paymentMethod) })}</li>` : ""}
    </ul>
    <p><strong>${t("emails.newRegistration.attendeesTitle", { count: n.attendees.length })}</strong></p>
    <ul>${attendeesHtml}</ul>
    <p><a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.newRegistration.cta")}</a></p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.newRegistration.footer")}</p>
  `;
    return { subject, html };
  };

  const { error } = await resend.batch.send(
    recipients.map(({ email, locale }) => ({ from, to: [email], ...render(locale) }))
  );

  if (error) {
    console.error("Resend sendNewRegistrationNotificationEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}

/**
 * Send email when the organizer marks a registration as refunded.
 * The refund itself is done outside the system; this only notifies the attendee.
 */
export async function sendRefundedEmail({
  to,
  registrationKey,
  amount,
  eventTitle,
  locale,
}: {
  to: string;
  registrationKey: string;
  amount: number;
  eventTitle?: string;
  locale: Locale;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping refunded email");
    return { ok: false, error: "Email not configured" };
  }

  const t = emailTranslator(locale);
  const url = registrationSuccessUrl(registrationKey);
  const subject = eventTitle
    ? t("emails.refunded.subject", { event: eventTitle })
    : t("emails.refunded.subjectNoEvent");
  const amountText = amount.toLocaleString("en-US");

  const html = `
    <p>${t("emails.greeting")}</p>
    <p>${eventTitle ? t.markup("emails.refunded.body", { event: escapeHtml(eventTitle), amount: amountText, strong }) : t.markup("emails.refunded.bodyNoEvent", { amount: amountText, strong })}</p>
    <p>${t("emails.refunded.cancelled")}</p>
    <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.refunded.cta")}</a></p>
    <p>${t("emails.refunded.closing")}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.signature")}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend sendRefundedEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}

export type TeamJoinEmail = {
  teamName: string;
  /** 查不到邀請人時為 null，信裡改寫「團隊管理員」 */
  inviterName: string | null;
  role: AssignableTeamRole;
};

function teamRoleHtml(t: ReturnType<typeof emailTranslator>, role: AssignableTeamRole): string {
  return `<p>${t.markup("emails.team.roleLine", {
    role: t(role === "member" ? "teamRoles.admin" : "teamRoles.staff"),
    description: t(`team.roleDescription.${role}`),
    strong,
  })}</p>`;
}

/**
 * 邀請還沒有帳號的人加入團隊。對方用收信的這個信箱註冊後，就會自動加入。
 */
export async function sendTeamInvitationEmail(
  to: string,
  n: TeamJoinEmail,
  locale: Locale
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping team invitation email");
    return { ok: false, error: "Email not configured" };
  }

  const t = emailTranslator(locale);
  const e = escapeHtml;
  const inviterName = n.inviterName ?? t("emails.team.inviterFallback");
  const subject = t("emails.teamInvitation.subject", { inviter: inviterName, team: n.teamName });
  const url = `${siteUrl}/register`;

  const html = `
    <p>${t("emails.greeting")}</p>
    <p>${t.markup("emails.teamInvitation.body", { inviter: e(inviterName), team: e(n.teamName), strong })}</p>
    ${teamRoleHtml(t, n.role)}
    <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.teamInvitation.cta")}</a></p>
    <p>${t("emails.teamInvitation.useThisEmail", { email: e(to) })}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.teamInvitation.footer")}</p>
  `;

  const { error } = await resend.emails.send({ from, to: [to], subject, html });

  if (error) {
    console.error("Resend sendTeamInvitationEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}

/**
 * 已經有帳號的人被直接加進團隊時，通知對方一聲。
 */
export async function sendTeamMemberAddedEmail(
  to: string,
  n: TeamJoinEmail,
  locale: Locale
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping team member added email");
    return { ok: false, error: "Email not configured" };
  }

  const t = emailTranslator(locale);
  const e = escapeHtml;
  const inviterName = n.inviterName ?? t("emails.team.inviterFallback");
  const subject = t("emails.teamMemberAdded.subject", { inviter: inviterName, team: n.teamName });
  const url = `${siteUrl}/login`;

  const html = `
    <p>${t("emails.greeting")}</p>
    <p>${t.markup("emails.teamMemberAdded.body", { inviter: e(inviterName), team: e(n.teamName), strong })}</p>
    ${teamRoleHtml(t, n.role)}
    <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #1E2F3D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${t("emails.teamMemberAdded.cta")}</a></p>
    <p>${t("emails.teamMemberAdded.switchTeam")}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">${t("emails.signature")}</p>
  `;

  const { error } = await resend.emails.send({ from, to: [to], subject, html });

  if (error) {
    console.error("Resend sendTeamMemberAddedEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}
