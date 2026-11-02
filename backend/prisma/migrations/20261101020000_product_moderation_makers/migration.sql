-- Additive provenance. Legacy NULLs mean unknown, never invented creator history.
ALTER TABLE "products" ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "submitted_by_id" UUID;
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "products" ADD CONSTRAINT "products_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX "idx_products_created_by" ON "products"("created_by_id");
CREATE INDEX "idx_products_submitted_by" ON "products"("submitted_by_id");
