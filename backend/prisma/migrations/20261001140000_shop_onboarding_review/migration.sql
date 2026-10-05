CREATE TYPE "ShopOnboardingStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'NEEDS_INFO',
  'VERIFIED',
  'REJECTED'
);

ALTER TABLE "stores"
  ADD COLUMN "onboarding_status" "ShopOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "onboarding_data" JSONB,
  ADD COLUMN "onboarding_submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "onboarding_reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN "onboarding_review_note" VARCHAR(1000);

-- Preserve existing Shop applications that stored legal documents in policy_return.
-- Cast only after checking the legacy value is JSON-shaped, so ordinary return-policy
-- text cannot make this migration fail.
WITH legacy_docs AS (
  SELECT
    "id",
    CASE
      WHEN "policy_return" ~ '^\s*\{' THEN "policy_return"::JSONB
      ELSE NULL
    END AS "docs"
  FROM "stores"
)
UPDATE "stores" AS store
SET
  "onboarding_data" = legacy_docs."docs",
  "onboarding_status" = CASE
    WHEN store."is_verified" THEN 'VERIFIED'::"ShopOnboardingStatus"
    WHEN legacy_docs."docs" ? 'submittedAt'
      THEN 'PENDING_APPROVAL'::"ShopOnboardingStatus"
    ELSE 'DRAFT'::"ShopOnboardingStatus"
  END,
  "onboarding_submitted_at" = CASE
    WHEN legacy_docs."docs" ? 'submittedAt'
      THEN NULLIF(legacy_docs."docs" ->> 'submittedAt', '')::TIMESTAMPTZ
    ELSE NULL
  END
FROM legacy_docs
WHERE store."id" = legacy_docs."id";

UPDATE "stores"
SET "is_active" = FALSE
WHERE "onboarding_status" <> 'VERIFIED';

CREATE INDEX "idx_stores_onboarding_status_submitted"
  ON "stores" ("onboarding_status", "onboarding_submitted_at");
