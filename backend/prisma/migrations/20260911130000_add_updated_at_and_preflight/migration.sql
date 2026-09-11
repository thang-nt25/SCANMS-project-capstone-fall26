-- Preflight: kiểm tra dữ liệu mồ côi referral_links trước khi hoàn tất ràng buộc
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "referral_links" rl
    LEFT JOIN "products" p ON p."id" = rl."product_id"
    WHERE p."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Có referral link tham chiếu sản phẩm không tồn tại';
  END IF;
END $$;

-- AlterTable referral_links: thêm updated_at và đặt destination_path NOT NULL
ALTER TABLE "referral_links" 
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "destination_path" SET NOT NULL;
