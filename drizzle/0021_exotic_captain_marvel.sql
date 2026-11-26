ALTER TABLE "event_purchase_items" ADD COLUMN "start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD COLUMN "end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD CONSTRAINT "event_purchase_items_location_id_event_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."event_locations"("id") ON DELETE set null ON UPDATE no action;