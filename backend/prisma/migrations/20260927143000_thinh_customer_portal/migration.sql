-- Customer portal upgrade: persisted cart, 14-day returns, policy consent and Customer <-> Shop chat.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

DO $$ BEGIN
  CREATE TYPE "ReturnRequestStatus" AS ENUM (
    'REQUESTED', 'SHOP_APPROVED', 'SHOP_REJECTED', 'DISPUTED', 'REFUNDED', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "policy_accepted_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "policy_snapshot" JSONB;

CREATE TABLE IF NOT EXISTS "customer_cart_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "variant_id" UUID,
  "variant_key" VARCHAR(36) NOT NULL DEFAULT 'base',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_cart_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_cart_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_customer_cart_line"
  ON "customer_cart_items"("user_id", "product_id", "variant_key");
CREATE INDEX IF NOT EXISTS "idx_customer_cart_user_updated"
  ON "customer_cart_items"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "idx_customer_cart_product"
  ON "customer_cart_items"("product_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cart_variant"
  ON "customer_cart_items"("variant_id");

DO $$ BEGIN
  ALTER TABLE "customer_cart_items" ADD CONSTRAINT "customer_cart_items_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "customer_cart_items" ADD CONSTRAINT "customer_cart_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "customer_cart_items" ADD CONSTRAINT "customer_cart_items_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "return_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "reason" "ReturnReason" NOT NULL,
  "details" VARCHAR(1000),
  "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "unboxing_video_url" TEXT NOT NULL,
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "deadline_at" TIMESTAMPTZ(6) NOT NULL,
  "shop_response" VARCHAR(1000),
  "shop_responded_at" TIMESTAMPTZ(6),
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_requests_image_required_check" CHECK (cardinality("image_urls") BETWEEN 1 AND 5),
  CONSTRAINT "return_requests_video_required_check" CHECK (length(btrim("unboxing_video_url")) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "return_requests_order_id_key" ON "return_requests"("order_id");
CREATE INDEX IF NOT EXISTS "idx_return_requests_customer" ON "return_requests"("customer_id", "submitted_at");
CREATE INDEX IF NOT EXISTS "idx_return_requests_status" ON "return_requests"("status", "submitted_at");

DO $$ BEGIN
  ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "conversations" ALTER COLUMN "collaborator_id" DROP NOT NULL;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
CREATE INDEX IF NOT EXISTS "idx_fk_conversations_customer" ON "conversations"("customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_conversation_store_customer"
  ON "conversations"("store_id", "customer_id") WHERE "customer_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_conversation_store_collaborator"
  ON "conversations"("store_id", "collaborator_id") WHERE "collaborator_id" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_check"
    CHECK (
      ("collaborator_id" IS NOT NULL AND "customer_id" IS NULL) OR
      ("collaborator_id" IS NULL AND "customer_id" IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
