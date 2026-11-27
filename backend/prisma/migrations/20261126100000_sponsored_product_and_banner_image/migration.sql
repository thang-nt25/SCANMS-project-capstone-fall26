ALTER TABLE "sponsored_placements"
  ADD COLUMN "product_id" UUID,
  ADD COLUMN "banner_image_url" VARCHAR(2000),
  ADD CONSTRAINT "sponsored_placements_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_sponsorship_product" ON "sponsored_placements"("product_id");
