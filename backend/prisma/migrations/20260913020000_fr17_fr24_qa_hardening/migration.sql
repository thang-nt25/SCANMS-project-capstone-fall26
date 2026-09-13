-- Reconcile FR-19/21 manual SQL with the migration history; safe when already applied.
DO $$ BEGIN
  CREATE TYPE "OrderSourcePlatform" AS ENUM ('INTERNAL', 'SHOPEE', 'TIKTOK', 'SHOPIFY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_platform "OrderSourcePlatform" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;
DROP INDEX IF EXISTS idx_unique_store_external_order;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_store_platform_external_order
  ON orders(store_id, source_platform, external_order_sn);
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
UPDATE commissions SET eligible_at = COALESCE(eligible_at, created_at),
  available_at = COALESCE(available_at, created_at + INTERVAL '14 days');
ALTER TABLE commissions ALTER COLUMN eligible_at SET NOT NULL, ALTER COLUMN available_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commissions_status_available ON commissions(status, available_at);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_snapshot_at TIMESTAMPTZ;
UPDATE order_items SET commission_snapshot_at = created_at
  WHERE commission_snapshot_at IS NULL AND (applied_commission_rate > 0 OR calculated_commission_amount > 0);
-- Do not delete existing duplicate reviews automatically. Resolve them with the owner first.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM product_reviews WHERE order_id IS NOT NULL GROUP BY order_id, product_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate order/product reviews detected. Review and reconcile duplicates before retrying migration.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review_order_product ON product_reviews(order_id, product_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;
