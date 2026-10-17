ALTER TABLE "sample_product_requests"
  ADD COLUMN IF NOT EXISTS "ghn_province_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "ghn_district_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "ghn_ward_code" VARCHAR(20);
