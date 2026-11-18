-- Wallet-wide requests have no store or bank API batch. Manual approval still
-- requires a private proof, its checksum, a bank reference, approver and time.
-- Preserve the existing branches for historical bank API / batch payouts.
BEGIN;
ALTER TABLE "payout_requests" DROP CONSTRAINT "payouts_approval_proof_check";
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_approval_proof_check"
CHECK ("status"::text <> 'APPROVED' OR
  ("approved_by_id" IS NOT NULL AND "processed_at" IS NOT NULL AND (
    ("transfer_provider" IS NULL AND "store_id" IS NOT NULL
      AND "proof_image_public_id" IS NOT NULL AND "proof_image_format" IS NOT NULL
      AND "proof_image_sha256" IS NOT NULL) OR
    ("transfer_provider" IN ('GATEWAY', 'BIDV_SANDBOX') AND "batch_id" IS NULL
      AND "bank_ref_code" IS NOT NULL AND btrim("bank_ref_code") <> '') OR
    ("transfer_provider" = 'MANUAL' AND "batch_id" IS NULL
      AND "bank_ref_code" IS NOT NULL AND btrim("bank_ref_code") <> ''
      AND "proof_image_public_id" IS NOT NULL AND btrim("proof_image_public_id") <> ''
      AND "proof_image_format" IS NOT NULL AND "proof_image_format" IN ('png', 'jpg', 'jpeg', 'webp', 'pdf')
      AND "proof_image_sha256" IS NOT NULL AND "proof_image_sha256" ~ '^[a-f0-9]{64}$')
  ))) NOT VALID;
COMMIT;
