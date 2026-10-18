DO $$ BEGIN
  CREATE TYPE "CouponBenefitType" AS ENUM ('GOODS', 'SHIPPING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "benefit_type" "CouponBenefitType" NOT NULL DEFAULT 'GOODS';

CREATE TABLE IF NOT EXISTS "stacked_voucher_redemptions" (
  "order_id" UUID NOT NULL,
  "coupon_id" UUID NOT NULL,
  "customer_phone" VARCHAR(20),
  "benefit_type" "CouponBenefitType" NOT NULL,
  "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'USED',
  "discount_amount" DECIMAL(15,2) NOT NULL,
  "shop_funded_amount" DECIMAL(15,2) NOT NULL,
  "platform_funded_amount" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stacked_voucher_redemptions_pkey" PRIMARY KEY ("order_id", "coupon_id")
);
CREATE INDEX IF NOT EXISTS "stacked_voucher_redemptions_coupon_id_idx" ON "stacked_voucher_redemptions"("coupon_id");
CREATE INDEX IF NOT EXISTS "stacked_voucher_redemptions_coupon_id_customer_phone_idx" ON "stacked_voucher_redemptions"("coupon_id", "customer_phone");
DO $$ BEGIN
  ALTER TABLE "stacked_voucher_redemptions" ADD CONSTRAINT "stacked_voucher_redemptions_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "stacked_voucher_redemptions" ADD CONSTRAINT "stacked_voucher_redemptions_coupon_id_fkey"
    FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
