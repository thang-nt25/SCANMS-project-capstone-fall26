-- Manual approvals may share evidence/reference while each request remains
-- protected by its status lock and unique financial posting identity.
BEGIN;
DROP INDEX IF EXISTS "idx_payouts_unique_bill_hash";
DROP INDEX IF EXISTS "idx_payouts_store_bank_ref";
CREATE UNIQUE INDEX "idx_payouts_unique_bill_hash" ON "payout_requests" ("proof_image_sha256")
WHERE "transfer_provider" IS DISTINCT FROM 'MANUAL';
CREATE UNIQUE INDEX "idx_payouts_store_bank_ref" ON "payout_requests" ("store_id", "bank_ref_code")
WHERE "transfer_provider" IS DISTINCT FROM 'MANUAL';
ALTER TABLE "customer_withdrawals" DROP CONSTRAINT IF EXISTS "customer_withdrawals_bank_ref_code_key";
ALTER TABLE "customer_withdrawals" DROP CONSTRAINT IF EXISTS "customer_withdrawals_proof_hash_key";
DROP INDEX IF EXISTS "customer_withdrawals_bank_ref_code_key";
DROP INDEX IF EXISTS "customer_withdrawals_proof_hash_key";
COMMIT;
