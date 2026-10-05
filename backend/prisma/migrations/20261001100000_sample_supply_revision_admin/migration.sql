ALTER TABLE "products"
  ADD COLUMN "sample_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "sample_quota" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sample_granted_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "product_variants"
  ADD COLUMN "sample_enabled" BOOLEAN,
  ADD COLUMN "sample_quota" INTEGER,
  ADD COLUMN "sample_granted_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "sample_product_requests"
  ADD COLUMN "product_variant_id" UUID,
  ADD COLUMN "recipient_name" VARCHAR(150),
  ADD COLUMN "recipient_phone" VARCHAR(30),
  ADD COLUMN "granted_at" TIMESTAMPTZ(6),
  ADD COLUMN "social_platform_snapshot" VARCHAR(50),
  ADD COLUMN "social_channel_name_snapshot" VARCHAR(150),
  ADD COLUMN "social_channel_url_snapshot" VARCHAR(1000),
  ADD COLUMN "social_follower_snapshot" INTEGER,
  ADD COLUMN "expected_reminder_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "shop_reminder_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "revision_deadline_at" TIMESTAMPTZ(6),
  ADD COLUMN "revision_reminder_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "revision_shop_reminder_sent_at" TIMESTAMPTZ(6);

ALTER TABLE "sample_product_requests"
  ADD CONSTRAINT "sample_product_requests_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_sample_req_product_variant"
  ON "sample_product_requests"("product_variant_id");

CREATE TABLE "sample_request_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sample_request_id" UUID NOT NULL,
  "actor_id" UUID,
  "action" VARCHAR(100) NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sample_request_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sample_request_events_sample_request_id_fkey"
    FOREIGN KEY ("sample_request_id") REFERENCES "sample_product_requests"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "sample_request_events_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "idx_sample_request_events_request_created"
  ON "sample_request_events"("sample_request_id", "created_at");
