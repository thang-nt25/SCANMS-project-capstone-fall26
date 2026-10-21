BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE "exclusive_deal_proposals"
  ADD COLUMN "target_orders" INTEGER,
  ADD COLUMN "commitment_days" INTEGER,
  ADD COLUMN "commitment_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "commitment_ends_at" TIMESTAMPTZ(6),
  ADD COLUMN "settlement_ends_at" TIMESTAMPTZ(6),
  ADD COLUMN "closed_at" TIMESTAMPTZ(6);

ALTER TABLE "exclusive_deal_proposals"
  ADD CONSTRAINT "exclusive_deal_kpi_target_check"
    CHECK ("target_orders" IS NULL OR "target_orders" BETWEEN 1 AND 1000000),
  ADD CONSTRAINT "exclusive_deal_kpi_duration_check"
    CHECK ("commitment_days" IS NULL OR "commitment_days" BETWEEN 1 AND 366),
  ADD CONSTRAINT "exclusive_deal_kpi_dates_check"
    CHECK ("commitment_started_at" IS NULL OR
      ("commitment_ends_at" > "commitment_started_at"
       AND "settlement_ends_at" >= "commitment_ends_at"));
-- Legacy text commitments are intentionally not parsed into invented targets.
COMMIT;
