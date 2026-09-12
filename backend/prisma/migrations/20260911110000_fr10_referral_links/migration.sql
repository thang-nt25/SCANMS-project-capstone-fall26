-- CreateEnum for ReferralLinkStatus (chỉ ACTIVE, PAUSED, BLOCKED; EXPIRED được tính toán tự động)
DO $$ BEGIN
    CREATE TYPE "ReferralLinkStatus" AS ENUM ('ACTIVE', 'PAUSED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for StoreCollaboratorStatus
DO $$ BEGIN
    CREATE TYPE "StoreCollaboratorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable products (thêm cờ nghiệp vụ is_affiliate_enabled)
ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "is_affiliate_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable store_collaborators (quan hệ chính thức giữa Shop và KOL)
CREATE TABLE IF NOT EXISTS "store_collaborators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "status" "StoreCollaboratorStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMPTZ(6),
    "note" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_collaborators_pkey" PRIMARY KEY ("id")
);

-- Unique index và foreign keys cho store_collaborators
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_store_collab" ON "store_collaborators"("store_id", "collaborator_id");
CREATE INDEX IF NOT EXISTS "idx_fk_store_collab_store" ON "store_collaborators"("store_id");
CREATE INDEX IF NOT EXISTS "idx_fk_store_collab_user" ON "store_collaborators"("collaborator_id");

DO $$ BEGIN
    ALTER TABLE "store_collaborators"
        ADD CONSTRAINT "store_collaborators_store_id_fkey"
        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "store_collaborators"
        ADD CONSTRAINT "store_collaborators_collaborator_id_fkey"
        FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable referral_links
ALTER TABLE "referral_links" 
    ADD COLUMN IF NOT EXISTS "store_id" UUID,
    ADD COLUMN IF NOT EXISTS "campaign_id" UUID,
    ADD COLUMN IF NOT EXISTS "label" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "channel" "SocialPlatform",
    ADD COLUMN IF NOT EXISTS "destination_path" VARCHAR(255) DEFAULT '/products',
    ADD COLUMN IF NOT EXISTS "utm_source" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_medium" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_campaign" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_content" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "status" "ReferralLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "disabled_reason" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "disabled_by" UUID,
    ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "last_accessed_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "custom_coupon_code" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "qr_code_url" TEXT,
    ADD COLUMN IF NOT EXISTS "total_clicks" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "unique_clicks" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "total_orders" INTEGER NOT NULL DEFAULT 0,
    DROP COLUMN IF EXISTS "is_active",
    DROP COLUMN IF EXISTS "is_deleted";

-- Backfill store_id from products if any existing records have null store_id
UPDATE "referral_links" rl
SET "store_id" = p."store_id"
FROM "products" p
WHERE rl."product_id" = p."id" AND rl."store_id" IS NULL;

-- Make store_id NOT NULL after backfill
ALTER TABLE "referral_links" ALTER COLUMN "store_id" SET NOT NULL;

-- AlterTable click_traffic_logs
ALTER TABLE "click_traffic_logs"
    ADD COLUMN IF NOT EXISTS "device_fingerprint" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "device_type" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "referrer" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "is_valid" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "rejection_reason" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "utm_source" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_medium" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_campaign" VARCHAR(100);

-- Foreign Keys cho referral_links
DO $$ BEGIN
    ALTER TABLE "referral_links" 
        ADD CONSTRAINT "referral_links_store_id_fkey" 
        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "referral_links" 
        ADD CONSTRAINT "referral_links_campaign_id_fkey" 
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Indexes cho referral_links
CREATE INDEX IF NOT EXISTS "idx_fk_ref_links_store" ON "referral_links"("store_id");
CREATE INDEX IF NOT EXISTS "idx_fk_ref_links_campaign" ON "referral_links"("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_ref_links_status_expires" ON "referral_links"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_ref_links_deleted" ON "referral_links"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_ref_links_coupon" ON "referral_links"("custom_coupon_code");
DROP INDEX IF EXISTS "idx_ref_links_status_active";

-- AlterTable orders (gắn referral_link_id phục vụ attribution đơn hàng)
ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "referral_link_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_fk_orders_referral_link" ON "orders"("referral_link_id");

DO $$ BEGIN
    ALTER TABLE "orders"
        ADD CONSTRAINT "orders_referral_link_id_fkey"
        FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable order_items (gắn referral_link_id phục vụ chi tiết hoa hồng từng sản phẩm)
ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "referral_link_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_fk_order_items_referral_link" ON "order_items"("referral_link_id");

DO $$ BEGIN
    ALTER TABLE "order_items"
        ADD CONSTRAINT "order_items_referral_link_id_fkey"
        FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
