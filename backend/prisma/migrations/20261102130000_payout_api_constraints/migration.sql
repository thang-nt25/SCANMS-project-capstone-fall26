-- Single API payouts do not belong to a bank-upload batch and use the
-- provider receipt instead of an uploaded bill. Keep FR-24 manual evidence.
BEGIN;

ALTER TABLE "payout_requests" DROP CONSTRAINT "payouts_processing_batch_check";
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_processing_source_check"
  CHECK ("status"::text <> 'PROCESSING' OR
    ("batch_id" IS NOT NULL AND "transfer_provider" IS NULL) OR
    ("batch_id" IS NULL AND "transfer_provider" IS NOT NULL
     AND "transfer_provider" IN ('GATEWAY', 'BIDV_SANDBOX')
     AND "approved_by_id" IS NOT NULL)) NOT VALID;

ALTER TABLE "payout_requests" DROP CONSTRAINT "payouts_approval_proof_check";
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_approval_proof_check"
  CHECK ("status"::text <> 'APPROVED' OR
    ("approved_by_id" IS NOT NULL AND "processed_at" IS NOT NULL AND (
      ("transfer_provider" IS NULL AND "store_id" IS NOT NULL
       AND "proof_image_public_id" IS NOT NULL AND "proof_image_format" IS NOT NULL
       AND "proof_image_sha256" IS NOT NULL) OR
      ("transfer_provider" IS NOT NULL
       AND "transfer_provider" IN ('GATEWAY', 'BIDV_SANDBOX') AND "batch_id" IS NULL
       AND "bank_ref_code" IS NOT NULL AND btrim("bank_ref_code") <> '')
    ))) NOT VALID;

COMMIT;
