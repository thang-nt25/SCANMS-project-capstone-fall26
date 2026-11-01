-- Preserve the immutable legacy ledger with explicit reclassification entries.
BEGIN;
-- Ambiguous legacy creator allocations are held for review, never guessed away.
CREATE TEMP TABLE wallet_reclassification ON COMMIT DROP AS
SELECT w.id, w.available_balance AS before_balance,
  CASE WHEN u.role <> 'COLLABORATOR' THEN GREATEST(w.available_balance,0)
       ELSE LEAST(GREATEST(w.available_balance - COALESCE(s.allocated,0),0),
                  GREATEST(COALESCE(l.shopping_net,0),0)) END AS amount,
  u.role = 'COLLABORATOR' AND GREATEST(COALESCE(l.shopping_net,0),0) >
    GREATEST(w.available_balance - COALESCE(s.allocated,0),0) AS needs_review
FROM wallets w JOIN users u ON u.id = w.collaborator_id
LEFT JOIN (SELECT wallet_id, SUM(available_balance) allocated FROM store_wallets GROUP BY wallet_id) s ON s.wallet_id=w.id
LEFT JOIN (SELECT wallet_id, SUM(amount) shopping_net FROM financial_ledgers
           WHERE reference_type IN ('TOPUP_PAYOS','TOPUP_DEMO','ORDER_PAYMENT')
              OR (reference_type='ORDER_REFUND' AND amount>0)
           GROUP BY wallet_id) l ON l.wallet_id=w.id;

INSERT INTO financial_ledgers (id,wallet_id,transaction_type,balance_bucket,amount,balance_before,balance_after,reference_id,reference_type,created_at)
SELECT gen_random_uuid(),id,'COMMISSION_APPROVED','AVAILABLE',-amount,before_balance,before_balance-amount,id,'WALLET_RECLASSIFICATION',now()
FROM wallet_reclassification WHERE amount>0;
INSERT INTO financial_ledgers (id,wallet_id,transaction_type,balance_bucket,amount,balance_before,balance_after,reference_id,reference_type,created_at)
SELECT gen_random_uuid(),id,'COMMISSION_APPROVED','SHOPPING',amount,0,amount,id,'WALLET_RECLASSIFICATION',now()
FROM wallet_reclassification WHERE amount>0;
UPDATE wallets w SET available_balance=w.available_balance-r.amount, shopping_balance=r.amount,
 earnings_review_required=r.needs_review, version=version+1
FROM wallet_reclassification r WHERE r.id=w.id;

-- Opening balances are an explicit cutover, not fabricated historical orders.
INSERT INTO finance_postings(event_key,reference_id,reference_type,debit_account,credit_account,amount)
SELECT id::text||':OPENING_AVAILABLE', id,'OPENING_BALANCE',
 CASE WHEN available_balance>0 THEN 'OPENING_CONTROL' ELSE 'PARTNER_EARNINGS_PAYABLE' END,
 CASE WHEN available_balance>0 THEN 'PARTNER_EARNINGS_PAYABLE' ELSE 'OPENING_CONTROL' END, ABS(available_balance)
FROM wallets WHERE available_balance<>0;
INSERT INTO finance_postings(event_key,reference_id,reference_type,debit_account,credit_account,amount)
SELECT id::text||':OPENING_PENDING',id,'OPENING_BALANCE','OPENING_CONTROL','AFFILIATE_ESCROW',pending_balance FROM wallets WHERE pending_balance>0;
INSERT INTO finance_postings(event_key,reference_id,reference_type,debit_account,credit_account,amount)
SELECT id::text||':OPENING_SHOPPING',id,'OPENING_BALANCE','OPENING_CONTROL','CUSTOMER_FUNDS',shopping_balance FROM wallets WHERE shopping_balance>0;
INSERT INTO finance_postings(event_key,reference_id,reference_type,debit_account,credit_account,amount)
SELECT id::text||':OPENING_RESERVED',id,'OPENING_BALANCE','OPENING_CONTROL','PAYOUT_RESERVED',amount
FROM payout_requests WHERE status IN ('PENDING','PROCESSING');
COMMIT;
