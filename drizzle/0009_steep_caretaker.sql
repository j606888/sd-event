CREATE TYPE "public"."coupon_discount_type" AS ENUM('fixed', 'percent');--> statement-breakpoint
CREATE TABLE "event_coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"code" text NOT NULL,
	"discount_type" "coupon_discount_type" NOT NULL,
	"value" integer NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_coupon_event_code" UNIQUE("event_id","code")
);
--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "coupon_id" integer;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_coupons" ADD CONSTRAINT "event_coupons_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_coupons_event_id" ON "event_coupons" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_coupon_id_event_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."event_coupons"("id") ON DELETE set null ON UPDATE no action;