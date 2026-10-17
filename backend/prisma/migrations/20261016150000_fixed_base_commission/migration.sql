-- Normalize only base policies. Historical order snapshots and bonus policies
-- (deals, campaigns, live sessions, tiers) are deliberately not updated.
UPDATE "stores" SET "default_commission_rate" = 10.00
WHERE "default_commission_rate" IS DISTINCT FROM 10.00;

UPDATE "products" SET "custom_commission_rate" = 10.00
WHERE "custom_commission_rate" IS DISTINCT FROM 10.00;

ALTER TABLE "products" ALTER COLUMN "custom_commission_rate" SET DEFAULT 10.00;
