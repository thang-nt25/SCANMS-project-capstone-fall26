BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE TYPE "SponsoredPlacementStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "SponsoredPlacementFunding" AS ENUM ('PAID', 'PLATFORM_GRANT');
CREATE TABLE "sponsored_placements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_key" UUID NOT NULL UNIQUE,
  "store_id" UUID NOT NULL REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requested_by_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reviewed_by_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "headline" VARCHAR(160) NOT NULL,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "SponsoredPlacementStatus" NOT NULL DEFAULT 'REQUESTED',
  "funding_type" "SponsoredPlacementFunding",
  "amount" DECIMAL(15,2),
  "payment_reference" VARCHAR(100) UNIQUE,
  "payment_proof_url" VARCHAR(2000),
  "review_note" VARCHAR(2000),
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sponsorship_valid_window" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "sponsorship_approval_evidence" CHECK (
    "status" <> 'APPROVED' OR (
      "reviewed_by_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "review_note" IS NOT NULL AND
      "funding_type" IS NOT NULL AND "amount" IS NOT NULL AND
      (("funding_type" = 'PLATFORM_GRANT' AND "amount" = 0) OR
       ("funding_type" = 'PAID' AND "amount" > 0 AND "payment_reference" IS NOT NULL AND "payment_proof_url" IS NOT NULL))
    )
  )
);
CREATE INDEX "idx_sponsorship_public_window" ON "sponsored_placements"("status", "starts_at", "ends_at");
CREATE INDEX "idx_sponsorship_store" ON "sponsored_placements"("store_id", "created_at");
-- JWT authorization lives in NestJS. Do not expose private payment evidence via Supabase's anonymous REST role.
ALTER TABLE "sponsored_placements" ENABLE ROW LEVEL SECURITY;
COMMIT;
