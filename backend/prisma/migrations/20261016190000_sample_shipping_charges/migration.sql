CREATE TABLE IF NOT EXISTS "sample_shipping_charges" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sample_request_id" UUID NOT NULL REFERENCES "sample_product_requests"("id") ON DELETE CASCADE,
  "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "carrier" VARCHAR(30) NOT NULL DEFAULT 'GHN',
  "environment" VARCHAR(10) NOT NULL DEFAULT 'LIVE',
  "tracking_number" VARCHAR(100) NOT NULL,
  "amount" DECIMAL(15,2),
  "payer" VARCHAR(10) NOT NULL DEFAULT 'SHOP' CHECK ("payer" = 'SHOP'),
  "cod_amount" INTEGER NOT NULL DEFAULT 0 CHECK ("cod_amount" = 0),
  "status" VARCHAR(30) NOT NULL,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("amount" IS NULL AND "status" = 'PENDING_CONFIRMATION') OR ("amount" IS NOT NULL AND "amount" >= 0 AND "status" = 'GHN_REPORTED')),
  UNIQUE ("carrier", "environment", "tracking_number")
);
CREATE INDEX IF NOT EXISTS "sample_shipping_charges_store_id_recorded_at_idx"
  ON "sample_shipping_charges"("store_id", "recorded_at");
