-- Customer-requested reverse pickup. Existing self-shipped returns remain intact.
ALTER TYPE "ReturnRequestStatus" ADD VALUE IF NOT EXISTS 'PICKUP_BOOKED';

ALTER TABLE "stores" ADD COLUMN "return_warehouse" JSONB;
ALTER TABLE "return_requests" ADD COLUMN "pickup_contact" JSONB;
ALTER TABLE "return_shipments"
  ADD COLUMN "provider" VARCHAR(30),
  ADD COLUMN "provider_status" VARCHAR(50),
  ADD COLUMN "client_order_code" VARCHAR(50),
  ADD COLUMN "fee_amount" INTEGER,
  ADD COLUMN "booked_at" TIMESTAMPTZ(6),
  ADD COLUMN "picked_up_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "return_shipments_client_order_code_key" ON "return_shipments"("client_order_code");

-- A courier-created pickup has no customer-uploaded receipt.
ALTER TABLE "return_shipments" DROP CONSTRAINT IF EXISTS "return_shipments_receipt_check";
