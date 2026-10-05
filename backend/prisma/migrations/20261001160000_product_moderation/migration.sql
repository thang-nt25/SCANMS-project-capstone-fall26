CREATE TYPE "ProductModerationStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "products"
  ADD COLUMN "moderation_status" "ProductModerationStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "moderation_reason" VARCHAR(1000),
  ADD COLUMN "moderated_at" TIMESTAMPTZ(6),
  ADD COLUMN "moderated_by_id" UUID,
  ADD COLUMN "ingredients" TEXT,
  ADD COLUMN "origin" VARCHAR(255),
  ADD COLUMN "label_info" TEXT;

-- Existing catalog items have already been published; preserve their availability.
UPDATE "products"
SET "moderation_status" = 'APPROVED'::"ProductModerationStatus",
    "moderated_at" = "updated_at"
WHERE "is_deleted" = FALSE;

CREATE INDEX "idx_products_moderation_status_created"
  ON "products" ("moderation_status", "created_at");
