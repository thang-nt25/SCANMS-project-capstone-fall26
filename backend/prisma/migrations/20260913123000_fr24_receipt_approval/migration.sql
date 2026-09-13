-- FR-24 receipt-first approval: a genuine bank reference is optional.
-- Keep mandatory private proof, approver, shop and timestamp; never invent a bank reference.
-- Existing unique bill-hash and shop/bank-reference indexes remain unchanged.
BEGIN;
ALTER TABLE "payout_requests" DROP CONSTRAINT "payouts_approval_proof_check";
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_approval_proof_check"
  CHECK ("status"::text <> 'APPROVED' OR
    ("store_id" IS NOT NULL AND "approved_by_id" IS NOT NULL
     AND "proof_image_public_id" IS NOT NULL AND "proof_image_format" IS NOT NULL
     AND "proof_image_sha256" IS NOT NULL AND "processed_at" IS NOT NULL)) NOT VALID;
COMMIT;
