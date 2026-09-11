-- Create unique partial index on financial_ledgers for reference_id and transaction_type
CREATE UNIQUE INDEX IF NOT EXISTS financial_ledgers_ref_commission_unique_idx
ON financial_ledgers (reference_id, transaction_type)
WHERE reference_id IS NOT NULL;
