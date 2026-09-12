-- =============================================================================
-- Migration: 20260912180000_fix_tracking_constraints_and_audit_history
-- Description: Enforce ON DELETE RESTRICT on click logs & attribution tables, and link commissions to adjustments
-- =============================================================================

-- 1. Sửa foreign key click_traffic_logs sang ON DELETE RESTRICT (Issue 2)
ALTER TABLE "click_traffic_logs" DROP CONSTRAINT IF EXISTS "click_traffic_logs_referral_link_id_fkey";
ALTER TABLE "click_traffic_logs" ADD CONSTRAINT "click_traffic_logs_referral_link_id_fkey" 
    FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 2. Đảm bảo attribution_sessions có foreign key ON DELETE RESTRICT
ALTER TABLE "attribution_sessions" DROP CONSTRAINT IF EXISTS "fk_attr_sess_link";
ALTER TABLE "attribution_sessions" ADD CONSTRAINT "fk_attr_sess_link" 
    FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 3. Đảm bảo attribution_adjustments có foreign key ON DELETE RESTRICT
ALTER TABLE "attribution_adjustments" DROP CONSTRAINT IF EXISTS "fk_attr_adjust_order";
ALTER TABLE "attribution_adjustments" ADD CONSTRAINT "fk_attr_adjust_order" 
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 4. Mở rộng attribution_adjustments liên kết hoa hồng bảo toàn lịch sử (Issue 4)
ALTER TABLE "attribution_adjustments" 
    ADD COLUMN IF NOT EXISTS "previous_commission_id" UUID,
    ADD COLUMN IF NOT EXISTS "new_commission_id" UUID;

ALTER TABLE "attribution_adjustments" DROP CONSTRAINT IF EXISTS "fk_attr_adjust_prev_comm";
ALTER TABLE "attribution_adjustments" ADD CONSTRAINT "fk_attr_adjust_prev_comm"
    FOREIGN KEY ("previous_commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "attribution_adjustments" DROP CONSTRAINT IF EXISTS "fk_attr_adjust_new_comm";
ALTER TABLE "attribution_adjustments" ADD CONSTRAINT "fk_attr_adjust_new_comm"
    FOREIGN KEY ("new_commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_attr_adjust_prev_comm" ON "attribution_adjustments"("previous_commission_id");
CREATE INDEX IF NOT EXISTS "idx_attr_adjust_new_comm" ON "attribution_adjustments"("new_commission_id");
