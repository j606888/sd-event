/**
 * One-off script to resend the payment-confirmed email for a registration.
 *
 * 主辦端現在也能從報名詳情的「⋯ → 重寄確認信」直接重寄；
 * 這支保留給沒有登入環境時（例如線上支援）使用。
 * Usage: npx tsx scripts/resend-payment-confirmed-email.ts <eventId> <registrationId>
 * Example: npx tsx scripts/resend-payment-confirmed-email.ts 1 1
 */
import "dotenv/config";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import {
  loadConfirmationEmailContext,
  sendConfirmationEmail,
} from "@/lib/registration-email";
import { eq, and } from "drizzle-orm";

async function main() {
  const eventId = Number(process.argv[2]);
  const registrationId = Number(process.argv[3]);

  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) {
    console.error("Usage: npx tsx scripts/resend-payment-confirmed-email.ts <eventId> <registrationId>");
    console.error("Example: npx tsx scripts/resend-payment-confirmed-email.ts 1 1");
    process.exit(1);
  }

  const [registration] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.id, registrationId)
      )
    )
    .limit(1);

  if (!registration) {
    console.error("Registration not found.");
    process.exit(1);
  }

  if (!registration.contactEmail) {
    console.error("Registration has no contact email (e.g. walk-in); nothing to send.");
    process.exit(1);
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    console.error("Event not found.");
    process.exit(1);
  }

  console.log(`Sending payment-confirmed email to ${registration.contactEmail}...`);
  const ctx = await loadConfirmationEmailContext(event);
  const result = await sendConfirmationEmail(
    ctx,
    registration.contactEmail,
    registration.registrationKey
  );

  if (result.ok) {
    console.log("Email sent successfully.");
  } else {
    console.error("Failed to send email:", result.error);
    process.exit(1);
  }
}

main();
