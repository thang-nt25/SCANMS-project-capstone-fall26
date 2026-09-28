CREATE TYPE "ExclusiveDealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "referral_links"
ADD COLUMN "exclusive_deal_id" UUID;

CREATE TABLE "exclusive_deal_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaborator_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "proposed_commission_rate" DECIMAL(5,2) NOT NULL,
    "approved_commission_rate" DECIMAL(5,2),
    "sales_commitment" VARCHAR(1000) NOT NULL,
    "status" "ExclusiveDealStatus" NOT NULL DEFAULT 'PENDING',
    "shop_response" VARCHAR(1000),
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exclusive_deal_proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_links_exclusive_deal_id_key"
ON "referral_links"("exclusive_deal_id");

CREATE INDEX "idx_exclusive_deal_store_status"
ON "exclusive_deal_proposals"("store_id", "status", "created_at" DESC);

CREATE INDEX "idx_exclusive_deal_collaborator_status"
ON "exclusive_deal_proposals"("collaborator_id", "status");

CREATE INDEX "idx_exclusive_deal_product"
ON "exclusive_deal_proposals"("product_id");

CREATE INDEX "idx_exclusive_deal_conversation"
ON "exclusive_deal_proposals"("conversation_id");

CREATE UNIQUE INDEX "idx_exclusive_deal_one_open_per_kol_product"
ON "exclusive_deal_proposals"("collaborator_id", "product_id")
WHERE "status" IN ('PENDING', 'APPROVED');

ALTER TABLE "exclusive_deal_proposals"
ADD CONSTRAINT "exclusive_deal_proposals_collaborator_id_fkey"
FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "exclusive_deal_proposals"
ADD CONSTRAINT "exclusive_deal_proposals_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "exclusive_deal_proposals"
ADD CONSTRAINT "exclusive_deal_proposals_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "exclusive_deal_proposals"
ADD CONSTRAINT "exclusive_deal_proposals_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "exclusive_deal_proposals"
ADD CONSTRAINT "exclusive_deal_proposals_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "referral_links"
ADD CONSTRAINT "referral_links_exclusive_deal_id_fkey"
FOREIGN KEY ("exclusive_deal_id") REFERENCES "exclusive_deal_proposals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
