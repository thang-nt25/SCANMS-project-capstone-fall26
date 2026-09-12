-- =============================================================================
-- Migration: 20260912170000_fr13_tracking_attribution_engine
-- Description: Full Database Schema for FR-13 Last-Click & Cookie Attribution Engine
-- =============================================================================

-- 1. Update AttributionMethod Enum to include ORGANIC
DO $$ BEGIN
    ALTER TYPE "AttributionMethod" ADD VALUE IF NOT EXISTS 'ORGANIC';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update click_traffic_logs table
ALTER TABLE "click_traffic_logs" 
    ADD COLUMN IF NOT EXISTS "event_id" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "store_id" UUID,
    ADD COLUMN IF NOT EXISTS "collaborator_id" UUID,
    ADD COLUMN IF NOT EXISTS "product_id" UUID,
    ADD COLUMN IF NOT EXISTS "campaign_id" UUID,
    ADD COLUMN IF NOT EXISTS "ip_hash" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "fingerprint_hash" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "is_unique" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "risk_reason" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "request_id" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "click_traffic_logs_event_id_key" ON "click_traffic_logs"("event_id");
CREATE INDEX IF NOT EXISTS "idx_click_logs_store_date" ON "click_traffic_logs"("store_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_click_logs_collab_date" ON "click_traffic_logs"("collaborator_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_click_logs_fp_date" ON "click_traffic_logs"("fingerprint_hash", "created_at" DESC);

-- 3. Create attribution_sessions table
CREATE TABLE IF NOT EXISTS "attribution_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "referral_link_id" UUID NOT NULL,
    "visitor_id_hash" VARCHAR(64) NOT NULL,
    "fingerprint_hash" VARCHAR(64) NOT NULL,
    "latest_click_id" UUID,
    "first_clicked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_clicked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_attr_sess_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "fk_attr_sess_collab" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "fk_attr_sess_link" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_store_visitor_session" ON "attribution_sessions"("store_id", "visitor_id_hash");
CREATE INDEX IF NOT EXISTS "idx_attr_sess_fp_date" ON "attribution_sessions"("fingerprint_hash", "last_clicked_at");
CREATE INDEX IF NOT EXISTS "idx_attr_sess_store_expires" ON "attribution_sessions"("store_id", "expires_at");

-- 4. Update orders table with attribution snapshot fields
ALTER TABLE "orders"
    ADD COLUMN IF NOT EXISTS "attribution_session_id" UUID,
    ADD COLUMN IF NOT EXISTS "click_id" UUID,
    ADD COLUMN IF NOT EXISTS "attribution_confidence" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "attribution_snapshot" JSONB,
    ADD COLUMN IF NOT EXISTS "attributed_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "clicked_at" TIMESTAMPTZ(6);

-- 5. Create attribution_adjustments table
CREATE TABLE IF NOT EXISTS "attribution_adjustments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "previous_collaborator_id" UUID,
    "new_collaborator_id" UUID,
    "reason" VARCHAR(255) NOT NULL,
    "evidence_url" TEXT,
    "adjusted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_attr_adjust_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "fk_attr_adjust_admin" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_attr_adjust_order" ON "attribution_adjustments"("order_id");
CREATE INDEX IF NOT EXISTS "idx_attr_adjust_admin" ON "attribution_adjustments"("admin_id");
