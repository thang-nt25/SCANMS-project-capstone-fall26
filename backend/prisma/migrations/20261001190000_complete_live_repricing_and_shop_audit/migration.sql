ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "onboarding_reviewed_by_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_onboarding_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "stores"
      ADD CONSTRAINT "stores_onboarding_reviewed_by_id_fkey"
      FOREIGN KEY ("onboarding_reviewed_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_stores_onboarding_reviewed_by"
  ON "stores"("onboarding_reviewed_by_id");

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "regular_commission_rate" DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "regular_commission_amount" DECIMAL(15, 2);
