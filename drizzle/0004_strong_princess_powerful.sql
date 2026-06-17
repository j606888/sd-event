CREATE TABLE "event_price_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_purchase_item_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_item_id" integer NOT NULL,
	"tier_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_item_tier" UNIQUE("purchase_item_id","tier_id")
);
--> statement-breakpoint
ALTER TABLE "event_registration_purchase_items" ADD COLUMN "unit_amount" integer;--> statement-breakpoint
ALTER TABLE "event_registration_purchase_items" ADD COLUMN "tier_name" text;--> statement-breakpoint
ALTER TABLE "event_price_tiers" ADD CONSTRAINT "event_price_tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_purchase_item_prices" ADD CONSTRAINT "event_purchase_item_prices_purchase_item_id_event_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."event_purchase_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_purchase_item_prices" ADD CONSTRAINT "event_purchase_item_prices_tier_id_event_price_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."event_price_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_price_tiers_event_id" ON "event_price_tiers" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_item_prices_item_id" ON "event_purchase_item_prices" USING btree ("purchase_item_id");