-- Migration: 20260910120000_fr09_full_lifecycle
-- Feature: FR-09 Full Lifecycle, Order Refunds, Shipping Fee, Completed At, Bonus Adjustments, and Partial Unique Index

-- 1. Commission Rules: Drop old non-partial constraint if exists, create partial unique index
ALTER TABLE "commission_rules" DROP CONSTRAINT IF EXISTS "idx_unique_commission_rule_threshold";
DROP INDEX IF EXISTS "idx_unique_commission_rule_threshold";

CREATE UNIQUE INDEX IF NOT EXISTS "commission_rules_store_min_rev_active_idx" 
ON "commission_rules" ("store_id", "min_monthly_revenue") 
WHERE "is_deleted" = false;

-- 2. Monthly Bonus Results: Add achievement_bonus, make bonus_percentage nullable, add approved_at, paid_at, wallet_transaction_id
ALTER TABLE "monthly_bonus_results" 
  ADD COLUMN IF NOT EXISTS "achievement_bonus" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "wallet_transaction_id" UUID,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now();

ALTER TABLE "monthly_bonus_results" 
  ALTER COLUMN "bonus_percentage" DROP NOT NULL;

-- 3. Orders: Add shipping_fee, completed_at, refunded_amount
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_fee" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "refunded_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS "idx_orders_status_completed" ON "orders"("status", "completed_at");

-- Backfill completed_at from updated_at for existing COMPLETED orders if null
UPDATE "orders" 
SET "completed_at" = "updated_at" 
WHERE "status" = 'COMPLETED' AND "completed_at" IS NULL;

-- 4. Order Refunds Table
CREATE TABLE IF NOT EXISTS "order_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "reason" TEXT,
  "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  "refunded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_order_refunds_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_fk_order_refunds_order" ON "order_refunds"("order_id");

-- 5. Bonus Adjustments Table
CREATE TABLE IF NOT EXISTS "bonus_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "collaborator_id" UUID NOT NULL,
  "original_settlement_id" UUID,
  "refund_id" UUID,
  "target_year_month" VARCHAR(7) NOT NULL,
  "adjustment_amount" DECIMAL(15, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "bonus_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_bonus_adjustments_settlement" FOREIGN KEY ("original_settlement_id") REFERENCES "monthly_bonus_results"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "fk_bonus_adjustments_refund" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_bonus_adjustments_target" ON "bonus_adjustments"("store_id", "collaborator_id", "target_year_month");
