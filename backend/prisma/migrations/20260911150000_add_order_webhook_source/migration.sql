-- Previously empty migration directory: restore FR-19 schema non-destructively.
DO $$ BEGIN
  CREATE TYPE "OrderSourcePlatform" AS ENUM ('INTERNAL', 'SHOPEE', 'TIKTOK', 'SHOPIFY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_platform "OrderSourcePlatform" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;
DROP INDEX IF EXISTS idx_unique_store_external_order;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_store_platform_external_order
  ON orders(store_id, source_platform, external_order_sn);
