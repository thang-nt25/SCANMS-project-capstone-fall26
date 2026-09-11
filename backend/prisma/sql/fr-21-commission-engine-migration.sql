-- FR-21: Track the 14-day holding period and clawback timestamps.
-- Existing commissions are backfilled from created_at to preserve their age.

ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

UPDATE commissions
SET
  eligible_at = COALESCE(eligible_at, created_at),
  available_at = COALESCE(available_at, created_at + INTERVAL '14 days');

ALTER TABLE commissions
  ALTER COLUMN eligible_at SET NOT NULL,
  ALTER COLUMN available_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_status_available
  ON commissions (status, available_at);
