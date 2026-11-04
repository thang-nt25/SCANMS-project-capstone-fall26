ALTER TYPE "ReturnReason" ADD VALUE IF NOT EXISTS 'CHANGE_OF_MIND';

ALTER TABLE "return_requests"
  ALTER COLUMN "unboxing_video_url" DROP NOT NULL,
  ADD COLUMN "preferred_resolution" "ReturnResolution";
