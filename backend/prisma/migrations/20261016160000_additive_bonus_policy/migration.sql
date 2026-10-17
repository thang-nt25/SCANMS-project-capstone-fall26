-- Policy changes affect future orders only. No order/commission snapshots change.
UPDATE collaborator_tiers SET extra_bonus_percentage = CASE
  WHEN name ILIKE '%diamond%' THEN 3
  WHEN name ILIKE '%gold%' THEN 2
  WHEN name ILIKE '%silver%' THEN 1
  ELSE 0 END;

-- Existing approved VIP rates were already capped to +3 by checkout.
-- Persist that same effective entitlement so every UI reports it consistently.
UPDATE exclusive_deal_proposals
SET approved_commission_rate = LEAST(13, GREATEST(11, ROUND(approved_commission_rate))),
    proposed_commission_rate = LEAST(13, GREATEST(11, ROUND(approved_commission_rate)))
WHERE status = 'APPROVED' AND approved_commission_rate IS NOT NULL
  AND approved_commission_rate NOT IN (11, 12, 13);

-- Do not invent a shop's budget or keep an invalid legacy campaign running.
UPDATE campaigns SET is_active = false,
  bonus_commission_rate = LEAST(2, GREATEST(1, bonus_commission_rate))
WHERE bonus_commission_rate NOT BETWEEN 1 AND 2
  OR bonus_budget_total IS NULL OR bonus_budget_total <= 0;

-- Leave ended/cancelled session history untouched; unsafe future/active sessions
-- need a new invitation with an explicitly selected micro bonus.
UPDATE live_shopping_sessions SET status = 'PAUSED'
WHERE status IN ('LIVE', 'SCHEDULED', 'PENDING_CREATOR')
  AND commission_rate NOT IN (2, 3);
