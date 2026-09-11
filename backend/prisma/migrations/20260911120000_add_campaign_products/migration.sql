-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_campaign_product" ON "campaign_products"("campaign_id", "product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_camp_prod_campaign" ON "campaign_products"("campaign_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_camp_prod_product" ON "campaign_products"("product_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_products_campaign_id_fkey'
    ) THEN
        ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_products_product_id_fkey'
    ) THEN
        ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
