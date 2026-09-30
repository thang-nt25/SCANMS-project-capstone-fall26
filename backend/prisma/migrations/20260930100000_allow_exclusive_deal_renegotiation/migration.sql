-- Keep one pending renegotiation per KOL/product, while retaining the full
-- history of approved commission versions.
DROP INDEX IF EXISTS "idx_exclusive_deal_one_open_per_kol_product";

CREATE UNIQUE INDEX "idx_exclusive_deal_one_open_per_kol_product"
ON "exclusive_deal_proposals"("collaborator_id", "product_id")
WHERE "status" = 'PENDING';
