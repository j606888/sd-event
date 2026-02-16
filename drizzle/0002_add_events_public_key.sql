-- 新增 public_key 欄位（先可為 null，以便回填既有資料）
ALTER TABLE "events" ADD COLUMN "public_key" text;
--> statement-breakpoint
-- 回填：為既有活動產生隨機 key（需 pgcrypto）
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
UPDATE "events" SET "public_key" = encode(gen_random_bytes(12), 'hex') WHERE "public_key" IS NULL;
--> statement-breakpoint
-- 設為必填並加上唯一約束
ALTER TABLE "events" ALTER COLUMN "public_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_public_key_unique" UNIQUE ("public_key");
