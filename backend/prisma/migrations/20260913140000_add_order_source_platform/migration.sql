-- Add OrderSourcePlatform enum and columns to orders table if not exists
DO $$ BEGIN
    CREATE TYPE "OrderSourcePlatform" AS ENUM ('INTERNAL', 'SHOPEE', 'LAZADA', 'TIKTOK', 'TIKI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source_platform" "OrderSourcePlatform" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "raw_payload" JSONB;
