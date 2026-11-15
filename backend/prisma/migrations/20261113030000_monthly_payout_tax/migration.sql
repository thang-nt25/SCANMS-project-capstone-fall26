BEGIN;
ALTER TABLE payout_requests ADD COLUMN tax_context JSONB;

-- Never change processing/exported, paid or rejected financial snapshots.
-- Reprice only requests that have not been sent to the bank.
WITH ranked AS (
  SELECT id, status, batch_id, amount,
    to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS tax_month,
    COALESCE(SUM(amount) OVER (
      PARTITION BY collaborator_id, date_trunc('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS base
  FROM payout_requests WHERE status IN ('PENDING', 'PROCESSING', 'APPROVED')
), calculated AS (
  SELECT *, ROUND(
    (LEAST(base + amount, 10000000) * .05
      + LEAST(GREATEST(base + amount - 10000000, 0), 20000000) * .10
      + LEAST(GREATEST(base + amount - 30000000, 0), 30000000) * .20
      + LEAST(GREATEST(base + amount - 60000000, 0), 40000000) * .30
      + GREATEST(base + amount - 100000000, 0) * .35)
    - (LEAST(base, 10000000) * .05
      + LEAST(GREATEST(base - 10000000, 0), 20000000) * .10
      + LEAST(GREATEST(base - 30000000, 0), 30000000) * .20
      + LEAST(GREATEST(base - 60000000, 0), 40000000) * .30
      + GREATEST(base - 100000000, 0) * .35), 2) AS tax
  FROM ranked WHERE status = 'PENDING' AND batch_id IS NULL
)
UPDATE payout_requests p SET tax_amount = c.tax, net_amount = p.amount - c.tax,
  tax_context = jsonb_build_object('policy', 'MONTHLY_PROGRESSIVE_V1', 'month', c.tax_month, 'monthlyGrossBefore', c.base::text)
FROM calculated c WHERE p.id = c.id;
COMMIT;
