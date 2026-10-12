CREATE TABLE "line_payees" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"label" text NOT NULL,
	"line_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_infos" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "line_payee_id" integer;--> statement-breakpoint
ALTER TABLE "line_payees" ADD CONSTRAINT "line_payees_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_line_payee_id_line_payees_id_fk" FOREIGN KEY ("line_payee_id") REFERENCES "public"."line_payees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- 搬移資料：主辦單位上的 LINE ID 轉成 LINE 付款好友，並讓原本用該主辦單位的活動指向它
INSERT INTO "line_payees" ("team_id", "label", "line_id")
SELECT DISTINCT "team_id", "name", btrim("line_id")
FROM "organizers"
WHERE "line_id" IS NOT NULL AND btrim("line_id") <> '';--> statement-breakpoint
UPDATE "events" e
SET "line_payee_id" = lp."id"
FROM "organizers" o, "line_payees" lp
WHERE e."organizer_id" = o."id"
  AND lp."team_id" = o."team_id"
  AND lp."label" = o."name"
  AND lp."line_id" = btrim(o."line_id");--> statement-breakpoint
ALTER TABLE "organizers" DROP COLUMN "line_id";