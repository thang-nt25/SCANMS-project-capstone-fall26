-- FR-15: Media and Review Moderation, Store policies and verification
BEGIN;

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- AlterTable stores
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "policy_return" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "policy_warranty" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "policy_shipping" VARCHAR(500);

-- AlterTable media_assets
ALTER TABLE "media_assets"
  ADD COLUMN IF NOT EXISTS "collaborator_id" UUID,
  ADD COLUMN IF NOT EXISTS "status" "MediaAssetStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "reviewed_by" UUID,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "rejection_reason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "poster_url" TEXT,
  ADD COLUMN IF NOT EXISTS "caption" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable product_reviews (change default is_approved to false)
ALTER TABLE "product_reviews"
  ALTER COLUMN "is_approved" SET DEFAULT false;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_collaborator') THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "fk_media_assets_collaborator" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_reviewer') THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "fk_media_assets_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_media_assets_collaborator" ON "media_assets"("collaborator_id");
CREATE INDEX IF NOT EXISTS "idx_media_assets_status" ON "media_assets"("status");

COMMIT;
