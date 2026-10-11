ALTER TABLE "event_purchase_items" ADD COLUMN "seat_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD COLUMN "description" text;