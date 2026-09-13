-- AlterTable: Bổ sung các mốc thời gian giữ hoa hồng và đối soát cho FR-21 / FR-15
ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "eligible_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "available_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMPTZ(6);

-- Backfill dữ liệu từ created_at cho các bản ghi hoa hồng hiện hữu
UPDATE "commissions"
SET
  "eligible_at" = COALESCE("eligible_at", "created_at"),
  "available_at" = COALESCE("available_at", "created_at" + INTERVAL '14 days');

-- Thiết lập NOT NULL cho các trường thời gian bắt buộc
ALTER TABLE "commissions"
  ALTER COLUMN "eligible_at" SET NOT NULL,
  ALTER COLUMN "available_at" SET NOT NULL;

-- Tạo Index tăng tốc truy vấn lọc hoa hồng khả dụng theo trạng thái
CREATE INDEX IF NOT EXISTS "idx_commissions_status_available"
  ON "commissions" ("status", "available_at");
