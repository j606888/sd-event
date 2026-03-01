/**
 * One-off script to resend the payment-confirmed email for a registration.
 * Usage: npx tsx scripts/resend-payment-confirmed-email.ts <eventId> <registrationId>
 * Example: npx tsx scripts/resend-payment-confirmed-email.ts 1 1
 */
import "dotenv/config";
import { db } from "@/db";
import { events, eventRegistrations, eventLocations } from "@/db/schema";
import { sendPaymentConfirmedEmail } from "@/lib/email";
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

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    console.error("Event not found.");
    process.exit(1);
  }

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
      location = {
        name: loc.name,
        googleMapUrl: loc.googleMapUrl ?? null,
      };
    }
  }

  console.log(`Sending payment-confirmed email to ${registration.contactEmail}...`);
  const result = await sendPaymentConfirmedEmail(
    registration.contactEmail,
    registration.registrationKey,
    event.title ?? undefined,
    event.startAt ? new Date(event.startAt).toISOString() : undefined,
    event.endAt ? new Date(event.endAt).toISOString() : undefined,
    location
  );

  if (result.ok) {
    console.log("Email sent successfully.");
  } else {
    console.error("Failed to send email:", result.error);
    process.exit(1);
  }
}

main();
