-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'SHOP_MANAGER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TIKTOK', 'FACEBOOK', 'YOUTUBE', 'INSTAGRAM', 'THREADS', 'ZALO', 'TELEGRAM', 'SHOPEE_VIDEO', 'LEMON8', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'COPYWRITE_TEXT');

-- CreateEnum
CREATE TYPE "SampleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "AttributionMethod" AS ENUM ('COOKIE', 'COUPON', 'FINGERPRINT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('COMMISSION_APPROVED', 'PAYOUT_WITHDRAW', 'REVERSAL', 'PAYOUT_REJECT_REFUND');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CampaignParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "full_name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "website_url" VARCHAR(255),
    "default_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "attribution_window_days" INTEGER NOT NULL DEFAULT 30,
    "min_payout_amount" DECIMAL(15,2) NOT NULL DEFAULT 200000.00,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "min_revenue_threshold" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "extra_bonus_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tier_id" UUID,
    "avatar_url" TEXT,
    "bio" TEXT,
    "id_card_number" VARCHAR(50),
    "tax_code" VARCHAR(50),
    "bank_name" VARCHAR(100) NOT NULL,
    "bank_account_number" VARCHAR(50) NOT NULL,
    "bank_account_name" VARCHAR(150) NOT NULL,
    "social_links_json" JSONB,
    "total_followers" INTEGER NOT NULL DEFAULT 0,
    "total_earned_commission" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "total_orders_referred" INTEGER NOT NULL DEFAULT 0,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_social_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "platform_name" "SocialPlatform" NOT NULL,
    "channel_name" VARCHAR(150),
    "channel_url" TEXT NOT NULL,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_social_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category_name" VARCHAR(100),
    "description" TEXT,
    "image_url" TEXT,
    "original_price" DECIMAL(15,2),
    "price" DECIMAL(15,2) NOT NULL,
    "custom_commission_rate" DECIMAL(5,2),
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "order_id" UUID,
    "customer_name" VARCHAR(150),
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "review_image_url" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "url_or_content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "min_monthly_revenue" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "achievement_bonus" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "bonus_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_bonus_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "valid_revenue" DECIMAL(15,2) NOT NULL,
    "applied_rule_id" UUID,
    "applied_rule_name" VARCHAR(150),
    "bonus_percentage" DECIMAL(5,2),
    "achievement_bonus" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "bonus_amount" DECIMAL(15,2) NOT NULL,
    "rule_snapshot" JSONB,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "settled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "wallet_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_bonus_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_product_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "shipping_address" TEXT NOT NULL,
    "tracking_number" VARCHAR(100),
    "status" "SampleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "short_code" VARCHAR(50) NOT NULL,
    "custom_coupon_code" VARCHAR(50),
    "qr_code_url" TEXT,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_traffic_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referral_link_id" UUID NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "device_fingerprint" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_traffic_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "bonus_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "status" "CampaignParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "joined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "external_order_sn" VARCHAR(100) NOT NULL,
    "attributed_collaborator_id" UUID,
    "attribution_method" "AttributionMethod",
    "customer_name" VARCHAR(150),
    "customer_phone" VARCHAR(20),
    "shipping_address" TEXT,
    "subtotal_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "final_amount" DECIMAL(15,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMPTZ(6),
    "refunded_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    "refunded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "original_settlement_id" UUID,
    "refund_id" UUID,
    "target_year_month" VARCHAR(7) NOT NULL,
    "adjustment_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "applied_commission_rate" DECIMAL(5,2) NOT NULL,
    "calculated_commission_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "commission_amount" DECIMAL(15,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "available_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "pending_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_ledgers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_before" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "store_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "net_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bank_name" VARCHAR(100),
    "bank_account_number" VARCHAR(50),
    "bank_account_name" VARCHAR(150),
    "bank_ref_code" VARCHAR(100),
    "proof_image_url" TEXT,
    "rejected_reason" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message_text" TEXT NOT NULL,
    "media_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "idx_fk_stores_owner" ON "stores"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_profiles_user_id_key" ON "collaborator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_fk_collab_profiles_tier" ON "collaborator_profiles"("tier_id");

-- CreateIndex
CREATE INDEX "idx_social_channels_collab" ON "collaborator_social_channels"("collaborator_id");

-- CreateIndex
CREATE INDEX "idx_fk_products_store" ON "products"("store_id");

-- CreateIndex
CREATE INDEX "idx_fk_product_reviews_product" ON "product_reviews"("product_id");

-- CreateIndex
CREATE INDEX "idx_fk_product_reviews_order" ON "product_reviews"("order_id");

-- CreateIndex
CREATE INDEX "idx_fk_media_assets_store" ON "media_assets"("store_id");

-- CreateIndex
CREATE INDEX "idx_fk_media_assets_product" ON "media_assets"("product_id");

-- CreateIndex
CREATE INDEX "idx_fk_commission_rules_store" ON "commission_rules"("store_id");

-- CreateIndex
CREATE INDEX "idx_monthly_bonus_store_month" ON "monthly_bonus_results"("store_id", "year_month");

-- CreateIndex
CREATE INDEX "idx_monthly_bonus_collab_month" ON "monthly_bonus_results"("collaborator_id", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_monthly_bonus_settlement" ON "monthly_bonus_results"("store_id", "collaborator_id", "year_month");

-- CreateIndex
CREATE INDEX "idx_fk_sample_req_collab" ON "sample_product_requests"("collaborator_id");

-- CreateIndex
CREATE INDEX "idx_fk_sample_req_product" ON "sample_product_requests"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_short_code_key" ON "referral_links"("short_code");

-- CreateIndex
CREATE INDEX "idx_fk_ref_links_collab" ON "referral_links"("collaborator_id");

-- CreateIndex
CREATE INDEX "idx_fk_ref_links_product" ON "referral_links"("product_id");

-- CreateIndex
CREATE INDEX "idx_ref_links_coupon" ON "referral_links"("custom_coupon_code");

-- CreateIndex
CREATE INDEX "idx_click_logs_link_date" ON "click_traffic_logs"("referral_link_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_fk_campaigns_store" ON "campaigns"("store_id");

-- CreateIndex
CREATE INDEX "idx_fk_campaign_part_campaign" ON "campaign_participants"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_fk_campaign_part_collab" ON "campaign_participants"("collaborator_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_campaign_collab" ON "campaign_participants"("campaign_id", "collaborator_id");

-- CreateIndex
CREATE INDEX "idx_fk_orders_store" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "idx_fk_orders_collab" ON "orders"("attributed_collaborator_id");

-- CreateIndex
CREATE INDEX "idx_orders_status_completed" ON "orders"("status", "completed_at");

-- CreateIndex
CREATE INDEX "idx_orders_status_created" ON "orders"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_store_external_order" ON "orders"("store_id", "external_order_sn");

-- CreateIndex
CREATE INDEX "idx_fk_order_refunds_order" ON "order_refunds"("order_id");

-- CreateIndex
CREATE INDEX "idx_bonus_adjustments_target" ON "bonus_adjustments"("store_id", "collaborator_id", "target_year_month");

-- CreateIndex
CREATE INDEX "idx_fk_order_items_order" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_fk_order_items_product" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_fk_commissions_order" ON "commissions"("order_id");

-- CreateIndex
CREATE INDEX "idx_commissions_collab_status" ON "commissions"("collaborator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_commission_order_collab" ON "commissions"("order_id", "collaborator_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_collaborator_id_key" ON "wallets"("collaborator_id");

-- CreateIndex
CREATE INDEX "idx_ledgers_wallet_date" ON "financial_ledgers"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_payouts_store_status" ON "payout_requests"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_payouts_pending" ON "payout_requests"("collaborator_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_fk_conversations_store" ON "conversations"("store_id");

-- CreateIndex
CREATE INDEX "idx_fk_conversations_collab" ON "conversations"("collaborator_id");

-- CreateIndex
CREATE INDEX "idx_fk_chat_messages_conv" ON "chat_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_fk_chat_messages_sender" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_fk_audit_logs_user" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collaborator_profiles" ADD CONSTRAINT "collaborator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collaborator_profiles" ADD CONSTRAINT "collaborator_profiles_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "collaborator_tiers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collaborator_social_channels" ADD CONSTRAINT "collaborator_social_channels_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bonus_results" ADD CONSTRAINT "monthly_bonus_results_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bonus_results" ADD CONSTRAINT "monthly_bonus_results_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bonus_results" ADD CONSTRAINT "monthly_bonus_results_applied_rule_id_fkey" FOREIGN KEY ("applied_rule_id") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sample_product_requests" ADD CONSTRAINT "sample_product_requests_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sample_product_requests" ADD CONSTRAINT "sample_product_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "click_traffic_logs" ADD CONSTRAINT "click_traffic_logs_referral_link_id_fkey" FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_attributed_collaborator_id_fkey" FOREIGN KEY ("attributed_collaborator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bonus_adjustments" ADD CONSTRAINT "bonus_adjustments_original_settlement_id_fkey" FOREIGN KEY ("original_settlement_id") REFERENCES "monthly_bonus_results"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bonus_adjustments" ADD CONSTRAINT "bonus_adjustments_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "financial_ledgers" ADD CONSTRAINT "financial_ledgers_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
