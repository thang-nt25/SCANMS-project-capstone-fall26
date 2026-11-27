BEGIN;
SET LOCAL lock_timeout = '8s';

ALTER TYPE "SponsoredPlacementStatus" ADD VALUE 'AWAITING_PAYMENT';
ALTER TYPE "SponsoredPlacementStatus" ADD VALUE 'PAYMENT_REVIEW';

ALTER TABLE "sponsored_placements"
  ADD COLUMN "payment_deadline" TIMESTAMPTZ(6),
  ADD COLUMN "payos_order_code" VARCHAR(16),
  ADD COLUMN "payos_link_id" VARCHAR(100),
  ADD COLUMN "payment_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "payment_checked_at" TIMESTAMPTZ(6),
  ADD COLUMN "paid_at" TIMESTAMPTZ(6),
  ADD COLUMN "received_amount" DECIMAL(15,2),
  ADD COLUMN "payment_issue" VARCHAR(255),
  DROP CONSTRAINT "sponsorship_approval_evidence";

CREATE UNIQUE INDEX "sponsored_placements_payos_order_code_key" ON "sponsored_placements"("payos_order_code");
CREATE UNIQUE INDEX "sponsored_placements_payos_link_id_key" ON "sponsored_placements"("payos_link_id");

ALTER TABLE "sponsored_placements" ADD CONSTRAINT "sponsorship_approval_evidence" CHECK (
  "status" <> 'APPROVED' OR (
    "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_note" IS NOT NULL AND
    "funding_type" IS NOT NULL AND "amount" IS NOT NULL AND
    (("funding_type" = 'PLATFORM_GRANT' AND "amount" = 0) OR (
      "funding_type" = 'PAID' AND "amount" > 0 AND "payment_reference" IS NOT NULL AND (
        ("payos_order_code" IS NULL AND "payment_proof_url" IS NOT NULL) OR
        ("payos_order_code" IS NOT NULL AND "payos_link_id" IS NOT NULL AND "paid_at" IS NOT NULL AND
         "received_amount" IS NOT NULL AND "received_amount" = "amount" AND
         "payment_deadline" IS NOT NULL AND "paid_at" <= "payment_deadline")
      )
    ))
  )
);
COMMIT;
