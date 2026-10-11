ALTER TABLE "event_attendees" ADD COLUMN "flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD COLUMN "min_flagged" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "attendee_flag_label" text;