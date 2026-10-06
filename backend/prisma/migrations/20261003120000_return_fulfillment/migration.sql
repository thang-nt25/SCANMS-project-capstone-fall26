-- Additive migration: preserve all existing requests and legacy status values.
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'RETURN_SHIPPED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'RETURN_RECEIVED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'INSPECTING';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'INSPECTION_REJECTED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'REFUND_PROCESSING';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'REFUND_FAILED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'EXCHANGE_PENDING';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'EXCHANGE_SHIPPED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CUSTOMER_CONFIRMATION';
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TYPE "ReturnShipmentDirection" AS ENUM ('CUSTOMER_TO_SHOP', 'SHOP_TO_CUSTOMER');
CREATE TYPE "ReturnResolution" AS ENUM ('REFUND', 'EXCHANGE');
CREATE TYPE "ReturnRefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "ReturnDisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

ALTER TABLE "return_requests"
  ADD COLUMN "ship_by_at" TIMESTAMPTZ(6),
  ADD COLUMN "return_address" VARCHAR(500),
  ADD COLUMN "return_instructions" VARCHAR(1000),
  ADD COLUMN "resolution" "ReturnResolution",
  ADD COLUMN "inspection_notes" VARCHAR(2000),
  ADD COLUMN "received_at" TIMESTAMPTZ(6),
  ADD COLUMN "inspection_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "inspection_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "inspection_escalated_at" TIMESTAMPTZ(6),
  ADD COLUMN "completed_at" TIMESTAMPTZ(6);

ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_shipping_instructions_check"
  CHECK ("ship_by_at" IS NULL OR ("return_address" IS NOT NULL AND "return_instructions" IS NOT NULL));
CREATE INDEX "idx_return_requests_ship_deadline" ON "return_requests"("status", "ship_by_at");
CREATE INDEX "idx_return_requests_inspection_sla" ON "return_requests"("status", "received_at");

CREATE TABLE "return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_request_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(15,2) NOT NULL,
  CONSTRAINT "return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "return_items_request_item_key" UNIQUE ("return_request_id", "order_item_id"),
  CONSTRAINT "return_items_request_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE,
  CONSTRAINT "return_items_order_item_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT
);

-- Existing return requests were order-wide; snapshot all order lines for them.
INSERT INTO "return_items" ("return_request_id", "order_item_id", "quantity", "unit_price")
SELECT r."id", i."id", i."quantity", i."unit_price"
FROM "return_requests" r
JOIN "order_items" i ON i."order_id" = r."order_id"
ON CONFLICT ("return_request_id", "order_item_id") DO NOTHING;

CREATE TABLE "return_shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_request_id" UUID NOT NULL,
  "direction" "ReturnShipmentDirection" NOT NULL,
  "carrier_name" VARCHAR(100) NOT NULL,
  "tracking_number" VARCHAR(100) NOT NULL,
  "receipt_image_url" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "shipped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "received_at" TIMESTAMPTZ(6),
  CONSTRAINT "return_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_shipments_request_direction_key" UNIQUE ("return_request_id", "direction"),
  CONSTRAINT "return_shipments_request_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE,
  CONSTRAINT "return_shipments_receipt_check" CHECK ("direction" <> 'CUSTOMER_TO_SHOP' OR "receipt_image_url" IS NOT NULL)
);
CREATE INDEX "return_shipments_tracking_number_idx" ON "return_shipments"("tracking_number");

CREATE TABLE "return_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_request_id" UUID NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "method" VARCHAR(50) NOT NULL,
  "provider" VARCHAR(50),
  "provider_reference" VARCHAR(150),
  "idempotency_key" VARCHAR(150) NOT NULL,
  "status" "ReturnRefundStatus" NOT NULL DEFAULT 'PENDING',
  "failure_reason" VARCHAR(1000),
  "processed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "return_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_refunds_request_key" UNIQUE ("return_request_id"),
  CONSTRAINT "return_refunds_provider_reference_key" UNIQUE ("provider_reference"),
  CONSTRAINT "return_refunds_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "return_refunds_positive_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "return_refunds_request_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT
);
CREATE INDEX "return_refunds_status_created_at_idx" ON "return_refunds"("status", "created_at");

CREATE TABLE "return_disputes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_request_id" UUID NOT NULL,
  "reason" VARCHAR(100) NOT NULL,
  "details" VARCHAR(2000) NOT NULL,
  "status" "ReturnDisputeStatus" NOT NULL DEFAULT 'OPEN',
  "ruling" VARCHAR(50),
  "resolution_notes" VARCHAR(3000),
  "resolved_by_id" UUID,
  "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  CONSTRAINT "return_disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_disputes_request_key" UNIQUE ("return_request_id"),
  CONSTRAINT "return_disputes_request_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT,
  CONSTRAINT "return_disputes_resolver_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "return_disputes_status_opened_at_idx" ON "return_disputes"("status", "opened_at");

CREATE TABLE "return_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_request_id" UUID NOT NULL,
  "actor_id" UUID,
  "type" VARCHAR(80) NOT NULL,
  "data" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "return_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_events_request_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE
);
CREATE INDEX "return_events_request_created_at_idx" ON "return_events"("return_request_id", "created_at");
