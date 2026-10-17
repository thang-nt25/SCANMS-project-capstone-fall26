-- Preserve lifecycle state when an Admin/Shop temporarily blocks a voucher.
-- No existing coupon, order or commission values are changed.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS status_before_block "CouponStatus";
