ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'VIDEO_SUBMITTED';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUIRED';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SampleRequestStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_ISSUE';

ALTER TABLE "collaborator_profiles"
  ADD COLUMN "sample_requests_blocked_at" TIMESTAMPTZ(6),
  ADD COLUMN "sample_requests_block_reason" VARCHAR(500);

ALTER TABLE "sample_product_requests"
  ADD COLUMN "social_channel_id" UUID,
  ADD COLUMN "content_type" VARCHAR(500),
  ADD COLUMN "expected_video_at" TIMESTAMPTZ(6),
  ADD COLUMN "accepted_terms_at" TIMESTAMPTZ(6),
  ADD COLUMN "carrier" VARCHAR(50),
  ADD COLUMN "rejected_reason" VARCHAR(500),
  ADD COLUMN "received_at" TIMESTAMPTZ(6),
  ADD COLUMN "deadline_at" TIMESTAMPTZ(6),
  ADD COLUMN "reminder_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "overdue_at" TIMESTAMPTZ(6),
  ADD COLUMN "video_url" VARCHAR(2000),
  ADD COLUMN "video_title" VARCHAR(255),
  ADD COLUMN "video_submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "video_rejection_reason" VARCHAR(500);

ALTER TABLE "sample_product_requests"
  ADD CONSTRAINT "sample_product_requests_social_channel_id_fkey"
  FOREIGN KEY ("social_channel_id") REFERENCES "collaborator_social_channels"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_sample_req_status_deadline"
  ON "sample_product_requests"("status", "deadline_at");
CREATE INDEX "idx_sample_req_social_channel"
  ON "sample_product_requests"("social_channel_id");

ALTER TABLE "media_assets"
  ADD COLUMN "sample_request_id" UUID;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_sample_request_id_fkey"
  FOREIGN KEY ("sample_request_id") REFERENCES "sample_product_requests"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_fk_media_assets_sample_request"
  ON "media_assets"("sample_request_id");
