ALTER TABLE "product_variants" ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb;
