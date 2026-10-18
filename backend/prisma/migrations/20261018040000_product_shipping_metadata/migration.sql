-- Additive: retain existing products and order history. Unknown measurements remain NULL.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE "products"
  ADD COLUMN "barcode" VARCHAR(13),
  ADD COLUMN "package_weight" INTEGER,
  ADD COLUMN "package_length" INTEGER,
  ADD COLUMN "package_width" INTEGER,
  ADD COLUMN "package_height" INTEGER;
ALTER TABLE "products"
  ADD CONSTRAINT "products_barcode_format" CHECK ("barcode" IS NULL OR "barcode" ~ '^[0-9]{13}$'),
  ADD CONSTRAINT "products_package_weight_range" CHECK ("package_weight" IS NULL OR "package_weight" BETWEEN 1 AND 30000),
  ADD CONSTRAINT "products_package_length_range" CHECK ("package_length" IS NULL OR "package_length" BETWEEN 1 AND 150),
  ADD CONSTRAINT "products_package_width_range" CHECK ("package_width" IS NULL OR "package_width" BETWEEN 1 AND 150),
  ADD CONSTRAINT "products_package_height_range" CHECK ("package_height" IS NULL OR "package_height" BETWEEN 1 AND 150);
CREATE INDEX "idx_products_barcode" ON "products"("barcode");
COMMIT;
