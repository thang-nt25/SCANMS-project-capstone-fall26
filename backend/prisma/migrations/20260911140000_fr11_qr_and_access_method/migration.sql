-- 1. CreateEnum AccessMethod
DO $$ BEGIN
    CREATE TYPE "AccessMethod" AS ENUM ('LINK', 'QR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add qr_download_count to referral_links
ALTER TABLE "referral_links"
    ADD COLUMN IF NOT EXISTS "qr_download_count" INTEGER NOT NULL DEFAULT 0;

-- 3. Add access_method to click_traffic_logs
ALTER TABLE "click_traffic_logs"
    ADD COLUMN IF NOT EXISTS "access_method" "AccessMethod" NOT NULL DEFAULT 'LINK';

-- 4. Create unique index on short_code if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "referral_links_short_code_key" ON "referral_links"("short_code");
