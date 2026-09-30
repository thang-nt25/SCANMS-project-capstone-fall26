-- Store the customer's explicitly confirmed delivery pin.
ALTER TABLE "customer_addresses"
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10, 7);

DO $$ BEGIN
  ALTER TABLE "customer_addresses"
    ADD CONSTRAINT "customer_addresses_coordinate_pair_check"
    CHECK (
      ("latitude" IS NULL AND "longitude" IS NULL) OR
      (
        "latitude" BETWEEN -90 AND 90 AND
        "longitude" BETWEEN -180 AND 180
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
