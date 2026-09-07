-- =============================================================================
-- INFLUXNET - POSTGRESQL DDL SCHEMA SCRIPT (VERSION 2.0.0 ENTERPRISE PRODUCTION)
-- Target DBMS: PostgreSQL 15+ / Supabase
-- Project: InfluxNet - KOL & Sales Collaborator Management Platform
-- Standards: Supabase Best Practices, Row-Level Security (RLS), Partial Indexing,
--            Auto-updated Triggers, FK B-Tree Indexes, Double-Entry Ledger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- -----------------------------------------------------------------------------
-- 1. USER & IDENTITY SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'SHOP_MANAGER', 'SHOP_STAFF', 'COLLABORATOR')),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    logo_url TEXT,
    description TEXT,
    website_url VARCHAR(255),
    default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (default_commission_rate >= 0),
    attribution_window_days INTEGER NOT NULL DEFAULT 30 CHECK (attribution_window_days BETWEEN 1 AND 365),
    min_payout_amount NUMERIC(15,2) NOT NULL DEFAULT 200000.00 CHECK (min_payout_amount >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE collaborator_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    min_revenue_threshold NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (min_revenue_threshold >= 0),
    extra_bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (extra_bonus_percentage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaborator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES collaborator_tiers(id) ON DELETE SET NULL,
    avatar_url TEXT,
    bio TEXT,
    id_card_number VARCHAR(50),
    tax_code VARCHAR(50),
    bank_name VARCHAR(100) NOT NULL,
    bank_account_number VARCHAR(50) NOT NULL,
    bank_account_name VARCHAR(150) NOT NULL,
    social_links_json JSONB,
    total_followers INTEGER NOT NULL DEFAULT 0 CHECK (total_followers >= 0),
    total_earned_commission NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_earned_commission >= 0),
    total_orders_referred INTEGER NOT NULL DEFAULT 0 CHECK (total_orders_referred >= 0),
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (kyc_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_collaborator_profiles_updated_at
    BEFORE UPDATE ON collaborator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE collaborator_social_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_name VARCHAR(50) NOT NULL CHECK (platform_name IN ('TIKTOK', 'FACEBOOK', 'YOUTUBE', 'INSTAGRAM', 'THREADS', 'ZALO', 'TELEGRAM', 'SHOPEE_VIDEO', 'LEMON8', 'OTHER')),
    channel_name VARCHAR(150),
    channel_url TEXT NOT NULL,
    follower_count INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. CATALOG & MEDIA SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category_name VARCHAR(100),
    description TEXT,
    image_url TEXT,
    original_price NUMERIC(15,2) CHECK (original_price >= 0),
    price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
    custom_commission_rate NUMERIC(5,2) CHECK (custom_commission_rate >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('IMAGE', 'VIDEO', 'COPYWRITE_TEXT')),
    url_or_content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    min_monthly_revenue NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (min_monthly_revenue >= 0),
    bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (bonus_percentage >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sample_product_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    shipping_address TEXT NOT NULL,
    tracking_number VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SHIPPED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_sample_product_requests_updated_at
    BEFORE UPDATE ON sample_product_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. TRACKING & REFERRAL SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    short_code VARCHAR(50) NOT NULL,
    custom_coupon_code VARCHAR(50),
    qr_code_url TEXT,
    total_clicks INTEGER NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
    total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE click_traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_link_id UUID NOT NULL REFERENCES referral_links(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    bonus_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (bonus_commission_rate >= 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. ORDER & ATTRIBUTION SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    external_order_sn VARCHAR(100) NOT NULL,
    attributed_collaborator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attribution_method VARCHAR(50) CHECK (attribution_method IN ('COOKIE', 'COUPON', 'FINGERPRINT')),
    customer_name VARCHAR(150),
    customer_phone VARCHAR(20),
    shipping_address TEXT,
    subtotal_amount NUMERIC(15,2) NOT NULL CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    final_amount NUMERIC(15,2) NOT NULL CHECK (final_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    applied_commission_rate NUMERIC(5,2) NOT NULL CHECK (applied_commission_rate >= 0),
    calculated_commission_amount NUMERIC(15,2) NOT NULL CHECK (calculated_commission_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commission_amount NUMERIC(15,2) NOT NULL CHECK (commission_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REVERSED')),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. FINANCIAL & SETTLEMENT SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE financial_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('COMMISSION_APPROVED', 'PAYOUT_WITHDRAW', 'REVERSAL', 'PAYOUT_REJECT_REFUND')),
    amount NUMERIC(15,2) NOT NULL,
    balance_before NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    bank_ref_code VARCHAR(100),
    proof_image_url TEXT,
    rejected_reason TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. COMMUNICATION, AI & AUDIT SUBSYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. PARTIAL UNIQUE INDEXES (SOFT-DELETE SAFE UNIQUE CONSTRAINTS)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX idx_users_active_email ON users(email) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_stores_active_slug ON stores(slug) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_ref_links_active_short_code ON referral_links(short_code) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_ref_links_active_coupon ON referral_links(custom_coupon_code) WHERE is_deleted = false AND custom_coupon_code IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 8. FOREIGN KEY B-TREE INDEXES (PREVENT FULL TABLE SCANS & OPTIMIZE JOINS)
-- -----------------------------------------------------------------------------

CREATE INDEX idx_fk_stores_owner ON stores(owner_id);
CREATE INDEX idx_fk_collab_profiles_tier ON collaborator_profiles(tier_id);
CREATE INDEX idx_fk_products_store ON products(store_id);
CREATE INDEX idx_fk_media_assets_store ON media_assets(store_id);
CREATE INDEX idx_fk_media_assets_product ON media_assets(product_id);
CREATE INDEX idx_fk_commission_rules_store ON commission_rules(store_id);
CREATE INDEX idx_fk_sample_req_collab ON sample_product_requests(collaborator_id);
CREATE INDEX idx_fk_sample_req_product ON sample_product_requests(product_id);
CREATE INDEX idx_fk_ref_links_collab ON referral_links(collaborator_id);
CREATE INDEX idx_fk_ref_links_product ON referral_links(product_id);
CREATE INDEX idx_fk_campaigns_store ON campaigns(store_id);
CREATE INDEX idx_fk_orders_store ON orders(store_id);
CREATE INDEX idx_fk_orders_collab ON orders(attributed_collaborator_id);
CREATE INDEX idx_fk_order_items_order ON order_items(order_id);
CREATE INDEX idx_fk_order_items_product ON order_items(product_id);
CREATE INDEX idx_fk_commissions_order ON commissions(order_id);
CREATE INDEX idx_fk_commissions_collab ON commissions(collaborator_id);
CREATE INDEX idx_fk_ledgers_wallet ON financial_ledgers(wallet_id);
CREATE INDEX idx_fk_payouts_collab ON payout_requests(collaborator_id);
CREATE INDEX idx_fk_conversations_store ON conversations(store_id);
CREATE INDEX idx_fk_conversations_collab ON conversations(collaborator_id);
CREATE INDEX idx_fk_chat_messages_conv ON chat_messages(conversation_id);
CREATE INDEX idx_fk_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_fk_audit_logs_user ON audit_logs(user_id);

-- -----------------------------------------------------------------------------
-- 9. STRATEGIC PARTIAL & FILTERED INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX idx_click_logs_link_date ON click_traffic_logs(referral_link_id, created_at DESC);
CREATE INDEX idx_orders_unattributed ON orders(created_at) WHERE attributed_collaborator_id IS NULL;
CREATE INDEX idx_payouts_pending ON payout_requests(collaborator_id, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_ledgers_wallet_date ON financial_ledgers(wallet_id, created_at DESC);
CREATE INDEX idx_social_channels_collab ON collaborator_social_channels(collaborator_id);
CREATE INDEX idx_products_store_active ON products(store_id, created_at DESC) WHERE is_deleted = false AND is_active = true;
CREATE INDEX idx_orders_collab_active ON orders(attributed_collaborator_id, created_at DESC) WHERE attributed_collaborator_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 10. ROW-LEVEL SECURITY (RLS) ACTIVATION
-- -----------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_social_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_traffic_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
