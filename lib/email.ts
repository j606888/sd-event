import { Resend } from "resend";
import { getEventDateLabel, getEventTimeRange } from "@/lib/format-event-date";

const apiKey = process.env.RESEND_API_KEY;
const from =
  process.env.EMAIL_FROM ?? "SD Event <noreply@sd-event.j606888.com>";
const siteUrl = process.env.SITE_URL ?? "https://sd-event.vercel.app";

const resend = apiKey ? new Resend(apiKey) : null;

function registrationSuccessUrl(registrationKey: string): string {
  return `${siteUrl}/registration-success/${registrationKey}`;
}

/**
 * Send email when user successfully applies for an event.
 * Contains link to view registration status.
 */
export async function sendRegistrationSuccessEmail(
  to: string,
  registrationKey: string,
  eventTitle?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping registration success email");
    return { ok: false, error: "Email not configured" };
  }

  const url = registrationSuccessUrl(registrationKey);
  const subject = eventTitle
    ? `[確認中] 您已成功報名活動：${eventTitle}`
    : "[確認中] 您已成功報名活動";

  const html = `
    <p>您好，</p>
    <p>感謝您報名${eventTitle ? `「${eventTitle}」` : "活動"}！</p>
    <p>我們已經收到您的報名資訊，請點擊下方連結確認您的報名狀態：</p>
    <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #5295BC; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">👉 查看報名狀態與付款資訊</a></p>
    <p><strong>注意事項：</strong></p>
    <ul>
      <li>若您尚未付款，請於 24 小時內完成匯款以保留名額。</li>
      <li>若您已完成匯款，請至上方連結回報後五碼，我們將儘速為您確認。</li>
    </ul>
    <p>期待在活動見到您！</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">— SD Event</p>
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
export async function sendPaymentConfirmedEmail(
  to: string,
  registrationKey: string,
  eventTitle?: string,
  eventStartAt?: string,
  eventEndAt?: string,
  eventLocation?: { name: string; googleMapUrl: string | null } | null
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping payment confirmed email");
    return { ok: false, error: "Email not configured" };
  }

  const url = registrationSuccessUrl(registrationKey);
  const entryVoucherUrl = `${siteUrl}/entry-voucher/${registrationKey}`;
  const subject = eventTitle
    ? `[報名成功] ${eventTitle}：付款已確認，這是您的活動憑證`
    : "[報名成功] 付款已確認，這是您的活動憑證";

  // Format event time (uses same helpers as UI for consistent timezone)
  const eventTimeText =
    eventStartAt && eventEndAt
      ? `${getEventDateLabel(eventStartAt, eventEndAt)} ${getEventTimeRange(eventStartAt, eventEndAt)}`
      : "";

  const html = `
    <p>您好，</p>
    <p>恭喜您！我們已確認收到您的款項，您的報名狀態已更新為「報名成功」。</p>
    <p>活動當天請出示下方連結中的憑證（QR Code）進行報到：</p>
    <p><a href="${entryVoucherUrl}" style="display: inline-block; padding: 12px 24px; background-color: #5295BC; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">🎫 打開我的活動憑證 / QR Code</a></p>
    ${eventTimeText || eventLocation ? `
    <p><strong>活動資訊：</strong></p>
    <ul>
      ${eventTimeText ? `<li>時間：${eventTimeText}</li>` : ""}
      ${eventLocation ? `<li>地點：${eventLocation.googleMapUrl ? `<a href="${eventLocation.googleMapUrl}">${eventLocation.name}</a>` : eventLocation.name}</li>` : ""}
    </ul>
    ` : ""}
    <p>如果有任何問題，歡迎直接回覆此郵件與我們聯繫。</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">— SD Event</p>
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
 * 每位收件者各寄一封，避免管理員之間互相看到 email。
 */
export async function sendNewRegistrationNotificationEmail(
  recipients: string[],
  n: NewRegistrationNotification
): Promise<{ ok: boolean; error?: string }> {
  if (recipients.length === 0) return { ok: true };
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping new registration notification email");
    return { ok: false, error: "Email not configured" };
  }

  const title = n.eventTitle ?? "活動";
  const subject = `[新報名] ${title} — ${n.contactName}`;
  const manageUrl = `${siteUrl}/events/${n.eventId}`;
  const e = escapeHtml;

  const attendeesHtml = n.attendees
    .map((a) => `<li>${e(a.name)}（${e(a.role)}）</li>`)
    .join("");
  const itemsText = n.itemNames.length > 0 ? n.itemNames.map(e).join("、") : "—";
  const amountText =
    n.totalAmount != null
      ? `NT$ ${n.totalAmount.toLocaleString("en-US")}${
          n.couponCode
            ? `（折扣碼 ${e(n.couponCode)}${n.discountAmount ? `，折抵 NT$ ${n.discountAmount.toLocaleString("en-US")}` : ""}）`
            : ""
        }`
      : "—";

  const html = `
    <p>「${e(title)}」有一筆新的報名：</p>
    <ul>
      <li>聯絡人：${e(n.contactName)}</li>
      ${n.contactPhone ? `<li>電話：${e(n.contactPhone)}</li>` : ""}
      ${n.contactEmail ? `<li>Email：${e(n.contactEmail)}</li>` : ""}
      <li>票種：${itemsText}${n.tierName ? `（${e(n.tierName)}）` : ""}</li>
      <li>金額：${amountText}</li>
      ${n.paymentMethod ? `<li>付款方式：${e(n.paymentMethod)}</li>` : ""}
    </ul>
    <p><strong>參加者（${n.attendees.length} 位）：</strong></p>
    <ul>${attendeesHtml}</ul>
    <p><a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #5295BC; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">查看報名名單</a></p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
    <p style="color: #666; font-size: 12px;">— SD Event｜您收到這封信是因為團隊設定中開啟了「新報名通知信」，可請團隊管理員在團隊頁關閉。</p>
  `;

  const { error } = await resend.batch.send(
    recipients.map((to) => ({ from, to: [to], subject, html }))
  );

  if (error) {
    console.error("Resend sendNewRegistrationNotificationEmail error:", error);
    return { ok: false, error: String(error.message) };
  }
  return { ok: true };
}
