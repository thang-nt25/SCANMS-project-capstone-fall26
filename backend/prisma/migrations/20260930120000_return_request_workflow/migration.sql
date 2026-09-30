ALTER TABLE "orders" ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

-- Historical delivery dates were not stored separately. Prefer the recorded
-- fulfillment event; completed_at is only a fallback for older records.
DO $$
DECLARE
  existing_order RECORD;
  parsed_delivery TIMESTAMPTZ;
BEGIN
  FOR existing_order IN
    SELECT "id", "raw_payload"->>'fulfillmentUpdatedAt' AS fulfillment_at, "completed_at"
    FROM "orders"
    WHERE "status" IN ('DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'DISPUTED', 'RETURNED')
  LOOP
    parsed_delivery := NULL;
    BEGIN
      IF existing_order.fulfillment_at IS NOT NULL THEN
        parsed_delivery := existing_order.fulfillment_at::timestamptz;
      END IF;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      parsed_delivery := NULL;
    END;
    UPDATE "orders"
    SET "delivered_at" = COALESCE(parsed_delivery, existing_order."completed_at")
    WHERE "id" = existing_order."id";
  END LOOP;
END $$;

ALTER TABLE "return_requests" ADD COLUMN "original_order_status" "OrderStatus" NOT NULL DEFAULT 'DELIVERED';

UPDATE "return_requests" AS r
SET "original_order_status" = 'COMPLETED'
FROM "orders" AS o
WHERE r."order_id" = o."id"
  AND o."completed_at" IS NOT NULL
  AND o."delivered_at" IS NOT NULL
  AND o."completed_at" > o."delivered_at";
