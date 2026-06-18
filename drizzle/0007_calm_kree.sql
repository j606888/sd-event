CREATE TYPE "public"."event_type" AS ENUM('Party', 'Workshop', 'Festival');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "type" "event_type" DEFAULT 'Party' NOT NULL;