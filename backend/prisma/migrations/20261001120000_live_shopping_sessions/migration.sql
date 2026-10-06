CREATE TYPE "LiveSessionStatus" AS ENUM (
  'PENDING_CREATOR', 'SCHEDULED', 'LIVE', 'PAUSED', 'ENDED', 'CANCELLED'
);

CREATE TYPE "LiveSessionPlatform" AS ENUM ('TIKTOK', 'YOUTUBE', 'FACEBOOK', 'OTHER');

CREATE TYPE "LiveSessionInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "live_shopping_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "creator_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "cover_image_url" TEXT,
  "description" TEXT,
  "platform" "LiveSessionPlatform" NOT NULL,
  "live_url" VARCHAR(1000) NOT NULL,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "LiveSessionStatus" NOT NULL DEFAULT 'PENDING_CREATOR',
  "invite_status" "LiveSessionInviteStatus" NOT NULL DEFAULT 'PENDING',
  "responded_at" TIMESTAMPTZ(6),
  "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_shopping_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "live_shopping_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_shopping_sessions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_shopping_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "live_session_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "variant_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_session_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "live_session_products_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_shopping_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_session_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_session_products_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "live_session_claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "claim_key" VARCHAR(100) NOT NULL,
  "user_id" UUID,
  "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_session_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "live_session_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_shopping_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "live_session_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "coupons" ADD COLUMN "live_session_id" UUID;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_live_session_id_fkey"
  FOREIGN KEY ("live_session_id") REFERENCES "live_shopping_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "coupons_live_session_id_key" ON "coupons"("live_session_id");
CREATE INDEX "live_shopping_sessions_store_id_status_starts_at_idx" ON "live_shopping_sessions"("store_id", "status", "starts_at");
CREATE INDEX "live_shopping_sessions_creator_id_invite_status_starts_at_idx" ON "live_shopping_sessions"("creator_id", "invite_status", "starts_at");
CREATE INDEX "live_shopping_sessions_status_ends_at_idx" ON "live_shopping_sessions"("status", "ends_at");
CREATE INDEX "live_session_products_session_id_product_id_idx" ON "live_session_products"("session_id", "product_id");
CREATE INDEX "live_session_products_product_id_variant_id_idx" ON "live_session_products"("product_id", "variant_id");
CREATE UNIQUE INDEX "live_session_claims_session_id_claim_key_key" ON "live_session_claims"("session_id", "claim_key");
CREATE INDEX "live_session_claims_session_id_claimed_at_idx" ON "live_session_claims"("session_id", "claimed_at");
