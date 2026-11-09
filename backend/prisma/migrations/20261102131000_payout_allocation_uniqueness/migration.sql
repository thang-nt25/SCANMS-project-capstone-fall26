-- One combined withdrawal reserves/refunds one ledger row per funding store.
-- Keep all other ledger references under the existing wallet/bucket rule.
BEGIN;

DROP INDEX "financial_ledgers_wallet_bucket_ref_type_unique_idx";
CREATE UNIQUE INDEX "financial_ledgers_wallet_bucket_ref_type_unique_idx"
  ON "financial_ledgers" ("wallet_id", "balance_bucket", "reference_id", "transaction_type")
  WHERE "reference_id" IS NOT NULL AND "reference_type" IS DISTINCT FROM 'PAYOUT_REQUEST';

CREATE UNIQUE INDEX "financial_ledgers_payout_allocation_unique_idx"
  ON "financial_ledgers" ("wallet_id", "balance_bucket", "reference_id", "transaction_type",
    COALESCE("store_id", '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE "reference_id" IS NOT NULL AND "reference_type" = 'PAYOUT_REQUEST';

COMMIT;
