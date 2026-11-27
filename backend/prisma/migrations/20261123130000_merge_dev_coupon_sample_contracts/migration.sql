ALTER TYPE "CouponStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADMIN_APPROVAL';
ALTER TYPE "CouponStatus" ADD VALUE IF NOT EXISTS 'PENDING_BLOCK_APPROVAL';

ALTER TABLE "collaborator_profiles"
    ADD COLUMN IF NOT EXISTS "deal_violation_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "deal_cooldown_until" TIMESTAMPTZ(6);

ALTER TABLE "sample_product_requests"
    ADD COLUMN IF NOT EXISTS "revision_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_collab_profiles_kyc_status" ON "collaborator_profiles"("kyc_status");
CREATE INDEX IF NOT EXISTS "idx_orders_store_created_desc" ON "orders"("store_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_store_status_created_desc" ON "orders"("store_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_customer_created_desc" ON "orders"("customer_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_commissions_deal_bonus" ON "commissions"("deal_proposal_id", "deal_bonus_status");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conv_created_desc" ON "chat_messages"("conversation_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created" ON "audit_logs"("action", "created_at");
