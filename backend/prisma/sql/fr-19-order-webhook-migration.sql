-- FR-19 migration proposal for databases already created from schema.prisma.
-- The repository currently has no Prisma migration baseline, so this script is
-- intentionally kept outside prisma/migrations to avoid breaking fresh shadow DBs.
CREATE TYPE "OrderSourcePlatform" AS ENUM (
  'INTERNAL',
  'SHOPEE',
  'TIKTOK',
  'SHOPIFY'
);

ALTER TABLE "orders"
ADD COLUMN "source_platform" "OrderSourcePlatform" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN "raw_payload" JSONB;

DROP INDEX IF EXISTS "idx_unique_store_external_order";

CREATE UNIQUE INDEX "idx_unique_store_platform_external_order"
ON "orders"("store_id", "source_platform", "external_order_sn");
