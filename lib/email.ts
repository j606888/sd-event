import { Resend } from "resend";

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
    ? `報名成功：${eventTitle}`
    : "報名成功 - SD Event";

  const html = `
    <p>您好，</p>
    <p>您已成功報名${eventTitle ? `「${eventTitle}」` : "活動"}。</p>
    <p>您可以使用以下連結查看報名狀態與進行付款回報：</p>
    <p><a href="${url}">${url}</a></p>
    <p>請妥善保存此連結。</p>
    <p>— SD Event</p>
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
  eventTitle?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping payment confirmed email");
    return { ok: false, error: "Email not configured" };
  }

  const url = registrationSuccessUrl(registrationKey);
  const subject = eventTitle
    ? `付款已確認：${eventTitle}`
    : "付款已確認 - SD Event";

  const html = `
    <p>您好，</p>
    <p>主辦方已確認收到您的款項${eventTitle ? `（活動：${eventTitle}）` : ""}。</p>
    <p>您可以使用以下連結查看報名狀態與入場憑證：</p>
    <p><a href="${url}">${url}</a></p>
    <p>請於活動當天出示入場憑證。</p>
    <p>— SD Event</p>
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
