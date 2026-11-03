-- Additive change: no reset, no rewriting historical commission snapshots.
ALTER TABLE payout_requests ADD COLUMN transfer_lease_id uuid;
ALTER TABLE payout_requests ADD COLUMN transfer_lease_until timestamptz(6);
ALTER TABLE order_refunds ADD COLUMN source_key varchar(100);
CREATE UNIQUE INDEX order_refunds_source_key_key ON order_refunds(source_key);

UPDATE collaborator_tiers SET min_revenue_threshold = 20000000, extra_bonus_percentage = 1
WHERE name IN ('Bạc', 'Silver', 'Bạc (Silver)');
UPDATE collaborator_tiers SET min_revenue_threshold = 50000000, extra_bonus_percentage = 2
WHERE name IN ('Vàng', 'Gold', 'Vàng (Gold)');
UPDATE collaborator_tiers SET min_revenue_threshold = 100000000, extra_bonus_percentage = 3
WHERE name IN ('Kim Cương', 'Diamond', 'Kim Cương (Diamond)');
