ALTER TABLE "event_registrations" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "refund_method" text;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "refund_note" text;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "refunded_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_refunded_by_user_id_users_id_fk" FOREIGN KEY ("refunded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;