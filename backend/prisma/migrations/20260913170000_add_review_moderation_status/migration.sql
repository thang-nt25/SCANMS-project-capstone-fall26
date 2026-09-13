-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "product_reviews" 
ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "reviewed_by" UUID,
ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "rejection_reason" VARCHAR(500);

-- Backfill status based on is_approved
UPDATE "product_reviews" 
SET "status" = 'APPROVED' 
WHERE "is_approved" = true AND "status" = 'PENDING';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_product_reviews_status" ON "product_reviews"("status");
