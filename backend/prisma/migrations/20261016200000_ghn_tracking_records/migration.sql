CREATE TABLE IF NOT EXISTS "ghn_tracking_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "environment" VARCHAR(10) NOT NULL CHECK ("environment" IN ('LIVE', 'TEST')),
  "order_code" VARCHAR(100) NOT NULL,
  "status" VARCHAR(40) NOT NULL,
  "events" JSONB NOT NULL DEFAULT '[]',
  "shipper_name" VARCHAR(150),
  "shipper_phone" VARCHAR(30),
  "contact_updated_at" TIMESTAMPTZ(6),
  "status_updated_at" TIMESTAMPTZ(6),
  "observed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("environment", "order_code")
);
