-- CreateEnum
CREATE TYPE "ExclusiveDealScope" AS ENUM ('SINGLE_PRODUCT', 'SELECTED_PRODUCTS', 'STORE_WIDE');

-- CreateEnum
CREATE TYPE "PricePromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ExclusiveDealStatus" ADD VALUE 'PENDING_ADMIN_APPROVAL';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "floor_price" DECIMAL(15,2),
ADD COLUMN     "list_price" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "floor_price" DECIMAL(15,2),
ADD COLUMN     "list_price" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "exclusive_deal_proposals" ADD COLUMN     "admin_approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "admin_approved_by_id" UUID,
ADD COLUMN     "exception_note" VARCHAR(1000),
ADD COLUMN     "recipient_accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "scope_key" VARCHAR(100),
ADD COLUMN     "scope_type" "ExclusiveDealScope" NOT NULL DEFAULT 'SINGLE_PRODUCT',
ADD COLUMN     "target_revenue" DECIMAL(15,2);

-- CreateTable
CREATE TABLE "exclusive_deal_products" (
    "proposal_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "referral_link_id" UUID,

    CONSTRAINT "exclusive_deal_products_pkey" PRIMARY KEY ("proposal_id","product_id")
);

-- CreateTable
CREATE TABLE "product_price_promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "requested_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "proposed_price" DECIMAL(15,2) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "budget_total" DECIMAL(15,2) NOT NULL,
    "budget_used" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reason" VARCHAR(1000) NOT NULL,
    "review_note" VARCHAR(1000),
    "status" "PricePromotionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMPTZ(6),
    "activated_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_promotion_usages" (
    "promotion_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_promotion_usages_pkey" PRIMARY KEY ("promotion_id","order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exclusive_deal_products_referral_link_id_key" ON "exclusive_deal_products"("referral_link_id");

-- CreateIndex
CREATE INDEX "exclusive_deal_products_product_id_idx" ON "exclusive_deal_products"("product_id");

-- CreateIndex
CREATE INDEX "product_price_promotions_status_starts_at_ends_at_idx" ON "product_price_promotions"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "product_price_promotions_store_id_created_at_idx" ON "product_price_promotions"("store_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "product_price_promotions_product_id_variant_id_status_idx" ON "product_price_promotions"("product_id", "variant_id", "status");

-- CreateIndex
CREATE INDEX "product_promotion_usages_order_id_idx" ON "product_promotion_usages"("order_id");

-- AddForeignKey
ALTER TABLE "exclusive_deal_proposals" ADD CONSTRAINT "exclusive_deal_proposals_admin_approved_by_id_fkey" FOREIGN KEY ("admin_approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exclusive_deal_products" ADD CONSTRAINT "exclusive_deal_products_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "exclusive_deal_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exclusive_deal_products" ADD CONSTRAINT "exclusive_deal_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exclusive_deal_products" ADD CONSTRAINT "exclusive_deal_products_referral_link_id_fkey" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_promotions" ADD CONSTRAINT "product_price_promotions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_promotions" ADD CONSTRAINT "product_price_promotions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_promotions" ADD CONSTRAINT "product_price_promotions_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_promotions" ADD CONSTRAINT "product_price_promotions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_promotions" ADD CONSTRAINT "product_price_promotions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_usages" ADD CONSTRAINT "product_promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_price_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_usages" ADD CONSTRAINT "product_promotion_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve current catalogue prices as MSRP. A reviewer supplies MAP explicitly;
-- no percentage heuristic is used to invent existing products' floor prices.
UPDATE products SET list_price = price WHERE list_price IS NULL;
UPDATE product_variants v SET list_price = COALESCE(v.price, p.list_price)
FROM products p WHERE p.id = v.product_id AND v.list_price IS NULL;
UPDATE exclusive_deal_proposals SET scope_key = 'PRODUCT:' || product_id::text WHERE scope_key IS NULL;
INSERT INTO exclusive_deal_products(proposal_id, product_id, referral_link_id)
SELECT d.id, d.product_id, r.id FROM exclusive_deal_proposals d
LEFT JOIN referral_links r ON r.exclusive_deal_id = d.id;

ALTER TABLE products ADD CONSTRAINT products_map_check CHECK
  (floor_price IS NULL OR (floor_price > 0 AND list_price IS NOT NULL AND floor_price <= list_price)) NOT VALID;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_map_check CHECK
  (floor_price IS NULL OR (floor_price > 0 AND list_price IS NOT NULL AND floor_price <= list_price)) NOT VALID;
ALTER TABLE product_price_promotions ADD CONSTRAINT price_promotions_money_window_check CHECK
  (proposed_price > 0 AND budget_total > 0 AND budget_used >= 0 AND budget_used <= budget_total AND ends_at > starts_at);
ALTER TABLE product_promotion_usages ADD CONSTRAINT price_promotion_usage_money_check CHECK (discount_amount >= 0 AND quantity > 0);
ALTER TABLE exclusive_deal_proposals ADD CONSTRAINT exclusive_deal_revenue_check CHECK (target_revenue IS NULL OR target_revenue > 0) NOT VALID;
