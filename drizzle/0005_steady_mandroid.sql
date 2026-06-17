CREATE TABLE "event_purchase_item_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" text NOT NULL,
	"selection_mode" text DEFAULT 'single' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "event_purchase_item_groups" ADD CONSTRAINT "event_purchase_item_groups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_purchase_item_groups_event_id" ON "event_purchase_item_groups" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "event_purchase_items" ADD CONSTRAINT "event_purchase_items_group_id_event_purchase_item_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."event_purchase_item_groups"("id") ON DELETE set null ON UPDATE no action;