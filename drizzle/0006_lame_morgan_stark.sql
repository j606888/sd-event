CREATE TABLE "event_group_exclusions" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"group_a_id" integer NOT NULL,
	"group_b_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_group_exclusion_pair" UNIQUE("group_a_id","group_b_id")
);
--> statement-breakpoint
ALTER TABLE "event_group_exclusions" ADD CONSTRAINT "event_group_exclusions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_group_exclusions" ADD CONSTRAINT "event_group_exclusions_group_a_id_event_purchase_item_groups_id_fk" FOREIGN KEY ("group_a_id") REFERENCES "public"."event_purchase_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_group_exclusions" ADD CONSTRAINT "event_group_exclusions_group_b_id_event_purchase_item_groups_id_fk" FOREIGN KEY ("group_b_id") REFERENCES "public"."event_purchase_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_group_exclusions_event_id" ON "event_group_exclusions" USING btree ("event_id");