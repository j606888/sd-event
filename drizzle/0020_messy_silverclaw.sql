CREATE TABLE "event_group_combo_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"combo_id" integer NOT NULL,
	"tier_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_combo_tier" UNIQUE("combo_id","tier_id")
);
--> statement-breakpoint
CREATE TABLE "event_group_combos" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"count" integer NOT NULL,
	"title" text,
	"amount" integer NOT NULL,
	"gift_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_group_combo_count" UNIQUE("group_id","count")
);
--> statement-breakpoint
ALTER TABLE "event_purchase_item_groups" ADD COLUMN "combo_pricing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration_purchase_items" ADD COLUMN "combo_title" text;--> statement-breakpoint
ALTER TABLE "event_registration_purchase_items" ADD COLUMN "is_gift" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_group_combo_prices" ADD CONSTRAINT "event_group_combo_prices_combo_id_event_group_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."event_group_combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_group_combo_prices" ADD CONSTRAINT "event_group_combo_prices_tier_id_event_price_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."event_price_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_group_combos" ADD CONSTRAINT "event_group_combos_group_id_event_purchase_item_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."event_purchase_item_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_group_combos" ADD CONSTRAINT "event_group_combos_gift_item_id_event_purchase_items_id_fk" FOREIGN KEY ("gift_item_id") REFERENCES "public"."event_purchase_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_combo_prices_combo_id" ON "event_group_combo_prices" USING btree ("combo_id");--> statement-breakpoint
CREATE INDEX "idx_group_combos_group_id" ON "event_group_combos" USING btree ("group_id");