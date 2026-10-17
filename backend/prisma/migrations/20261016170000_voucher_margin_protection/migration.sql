-- Future voucher eligibility only; preserve every order and redemption snapshot.
ALTER TABLE coupons ALTER COLUMN stackable_with_platform_voucher SET DEFAULT true;
UPDATE coupons
SET stackable_with_shop_voucher = (funding_source = 'PLATFORM_FUNDED' AND benefit_type = 'GOODS'),
    stackable_with_platform_voucher = true
WHERE stackable_with_shop_voucher IS DISTINCT FROM (funding_source = 'PLATFORM_FUNDED' AND benefit_type = 'GOODS')
   OR stackable_with_platform_voucher IS DISTINCT FROM true;
