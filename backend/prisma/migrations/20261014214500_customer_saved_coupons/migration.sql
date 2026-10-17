CREATE TABLE IF NOT EXISTS "customer_saved_coupons" (
  "user_id" UUID NOT NULL,
  "coupon_id" UUID NOT NULL,
  "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_saved_coupons_pkey" PRIMARY KEY ("user_id", "coupon_id")
);

CREATE INDEX IF NOT EXISTS "customer_saved_coupons_coupon_id_idx" ON "customer_saved_coupons"("coupon_id");

DO $$ BEGIN
  ALTER TABLE "customer_saved_coupons" ADD CONSTRAINT "customer_saved_coupons_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_saved_coupons" ADD CONSTRAINT "customer_saved_coupons_coupon_id_fkey"
    FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
