-- =============================================================================
-- Migration: 20260912100000_fr12_coupons_and_attribution
-- Description: Full Database Schema for FR-12 Coupon Attribution & Notifications
-- =============================================================================

-- 1. Create Enums if not exist
DO $$ BEGIN
    CREATE TYPE "CouponStatus" AS ENUM (
        'PENDING_APPROVAL',
        'ACTIVE',
        'PAUSED',
        'REJECTED',
        'EXPIRED',
        'BLOCKED',
        'DELETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DiscountType" AS ENUM (
        'PERCENTAGE',
        'FIXED_AMOUNT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CouponScope" AS ENUM (
        'STORE_WIDE',
        'PRODUCTS',
        'CATEGORIES',
        'CAMPAIGN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CouponFundingSource" AS ENUM (
        'SHOP_FUNDED',
        'CO_FUNDED',
        'PLATFORM_FUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CouponRedemptionStatus" AS ENUM (
        'RESERVED',
        'USED',
        'CANCELLED',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter Table orders to add idempotency and coupon snapshot columns
ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "coupon_id" UUID,
    ADD COLUMN IF NOT EXISTS "coupon_code_snapshot" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "coupon_discount_amount" DECIMAL(15, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS "override_reason" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "original_attribution_method" "AttributionMethod",
    ADD COLUMN IF NOT EXISTS "original_collaborator_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- 3. Create Table coupons
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code_normalized" VARCHAR(20) NOT NULL,
    "display_code" VARCHAR(20) NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "campaign_id" UUID,
    "status" "CouponStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "discount_type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "minimum_order_amount" DECIMAL(15, 2),
    "maximum_discount_amount" DECIMAL(15, 2),
    "usage_limit_total" INTEGER,
    "usage_limit_per_customer" INTEGER NOT NULL DEFAULT 1,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "budget_total" DECIMAL(15, 2),
    "budget_used" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "starts_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "scope_type" "CouponScope" NOT NULL DEFAULT 'STORE_WIDE',
    "funding_source" "CouponFundingSource" NOT NULL DEFAULT 'SHOP_FUNDED',
    "shop_funding_rate" DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    "platform_funding_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    "stackable_with_product_discount" BOOLEAN NOT NULL DEFAULT false,
    "stackable_with_shop_voucher" BOOLEAN NOT NULL DEFAULT false,
    "stackable_with_platform_voucher" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_reason" VARCHAR(255),
    "blocked_reason" VARCHAR(255),
    "deleted_by" UUID,
    "delete_reason" VARCHAR(255),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_normalized_key" ON "coupons"("code_normalized");
CREATE INDEX IF NOT EXISTS "idx_fk_coupons_collaborator" ON "coupons"("collaborator_id");
CREATE INDEX IF NOT EXISTS "idx_fk_coupons_store" ON "coupons"("store_id");
CREATE INDEX IF NOT EXISTS "idx_coupons_status_expires" ON "coupons"("status", "expires_at");

-- 4. Create Table coupon_products
CREATE TABLE IF NOT EXISTS "coupon_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "idx_unique_coupon_product" UNIQUE ("coupon_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "idx_fk_coupon_prod_coupon" ON "coupon_products"("coupon_id");
CREATE INDEX IF NOT EXISTS "idx_fk_coupon_prod_product" ON "coupon_products"("product_id");

-- 5. Create Table coupon_categories
CREATE TABLE IF NOT EXISTS "coupon_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "idx_unique_coupon_category" UNIQUE ("coupon_id", "category_name")
);

CREATE INDEX IF NOT EXISTS "idx_fk_coupon_cat_coupon" ON "coupon_categories"("coupon_id");

-- 6. Create Table coupon_redemptions
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "customer_id" UUID,
    "customer_phone" VARCHAR(20),
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'USED',
    "discount_amount" DECIMAL(15, 2) NOT NULL,
    "shop_funded_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "platform_funded_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "eligible_subtotal" DECIMAL(15, 2) NOT NULL,
    "coupon_code_snapshot" VARCHAR(20) NOT NULL,
    "discount_type_snapshot" "DiscountType" NOT NULL,
    "discount_value_snapshot" DECIMAL(15, 2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");
CREATE INDEX IF NOT EXISTS "idx_fk_redemptions_coupon" ON "coupon_redemptions"("coupon_id");
CREATE INDEX IF NOT EXISTS "idx_fk_redemptions_collab" ON "coupon_redemptions"("collaborator_id");
CREATE INDEX IF NOT EXISTS "idx_fk_redemptions_store" ON "coupon_redemptions"("store_id");
CREATE INDEX IF NOT EXISTS "idx_redemptions_phone" ON "coupon_redemptions"("customer_phone");

-- 7. Create Table notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications"("user_id", "is_read");

-- 8. Add Foreign Keys with Financial Integrity (ON DELETE RESTRICT for Coupons and Redemptions)
DO $$ BEGIN
    ALTER TABLE "coupons"
        ADD CONSTRAINT "coupons_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "coupons_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        ADD CONSTRAINT "coupons_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "coupon_products"
        ADD CONSTRAINT "coupon_products_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        ADD CONSTRAINT "coupon_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "coupon_categories"
        ADD CONSTRAINT "coupon_categories_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "coupon_redemptions"
        ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "notifications"
        ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "orders"
        ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_token" VARCHAR(100);

