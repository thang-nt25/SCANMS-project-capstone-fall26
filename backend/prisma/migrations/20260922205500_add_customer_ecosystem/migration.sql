-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_id" UUID;

-- CreateTable customer_addresses
CREATE TABLE IF NOT EXISTS "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(50),
    "province_name" VARCHAR(100) NOT NULL,
    "district_code" VARCHAR(50),
    "district_name" VARCHAR(100) NOT NULL,
    "ward_code" VARCHAR(50),
    "ward_name" VARCHAR(100) NOT NULL,
    "detail_address" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_wishlists
CREATE TABLE IF NOT EXISTS "customer_wishlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_orders_customer" ON "orders"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_fk_customer_addresses_user" ON "customer_addresses"("user_id");
CREATE INDEX IF NOT EXISTS "idx_fk_customer_wishlist_user" ON "customer_wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_fk_customer_wishlist_product" ON "customer_wishlists"("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_customer_wishlist" ON "customer_wishlists"("user_id", "product_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_id_fkey'
    ) THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_addresses_user_id_fkey'
    ) THEN
        ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_wishlists_user_id_fkey'
    ) THEN
        ALTER TABLE "customer_wishlists" ADD CONSTRAINT "customer_wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_wishlists_product_id_fkey'
    ) THEN
        ALTER TABLE "customer_wishlists" ADD CONSTRAINT "customer_wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
