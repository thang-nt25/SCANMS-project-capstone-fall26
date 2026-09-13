-- Additive schema changes. Existing ledger entries are never rewritten.
BEGIN;
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'COMMISSION_PENDING';
CREATE TYPE "WalletBalanceBucket" AS ENUM ('AVAILABLE', 'PENDING');
ALTER TABLE "financial_ledgers"
  ADD COLUMN "balance_bucket" "WalletBalanceBucket" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "reference_type" VARCHAR(30);

-- Approval transfers produce one entry per bucket. A refund may affect multiple wallets.
CREATE UNIQUE INDEX "financial_ledgers_wallet_bucket_ref_type_unique_idx"
  ON "financial_ledgers" ("wallet_id", "balance_bucket", "reference_id", "transaction_type")
  WHERE "reference_id" IS NOT NULL;
DROP INDEX IF EXISTS "financial_ledgers_ref_commission_unique_idx";

-- Enforce new entries without rewriting or rejecting potentially inconsistent legacy entries.
ALTER TABLE "financial_ledgers" ADD CONSTRAINT "financial_ledgers_signed_amount_check"
  CHECK ("amount" <> 0 AND "balance_after" = "balance_before" + "amount") NOT VALID;

-- Parent deletion must not erase financial history via a cascading foreign key.
ALTER TABLE "financial_ledgers" DROP CONSTRAINT "financial_ledgers_wallet_id_fkey";
ALTER TABLE "financial_ledgers" ADD CONSTRAINT "financial_ledgers_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE FUNCTION "reject_financial_ledger_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'financial_ledgers is append-only: UPDATE, DELETE and TRUNCATE are forbidden'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "financial_ledgers_no_update_delete"
  BEFORE UPDATE OR DELETE ON "financial_ledgers"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_ledger_mutation"();
CREATE TRIGGER "financial_ledgers_no_truncate"
  BEFORE TRUNCATE ON "financial_ledgers"
  FOR EACH STATEMENT EXECUTE FUNCTION "reject_financial_ledger_mutation"();
REVOKE UPDATE, DELETE, TRUNCATE ON "financial_ledgers" FROM PUBLIC;
COMMIT;
