ALTER TABLE "event_registrations" ALTER COLUMN "contact_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registrations" ALTER COLUMN "contact_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "source" text DEFAULT 'online' NOT NULL;