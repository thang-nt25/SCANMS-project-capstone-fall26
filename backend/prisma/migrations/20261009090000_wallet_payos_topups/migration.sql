CREATE TABLE "wallet_top_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "order_code" BIGINT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'CREATING',
  "payment_link_id" TEXT,
  "checkout_url" TEXT,
  "qr_code" TEXT,
  "bin" TEXT,
  "account_number" TEXT,
  "account_name" TEXT,
  "description" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "paid_at" TIMESTAMPTZ(6),
  "next_check_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_top_ups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_top_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wallet_top_ups_amount_check" CHECK (amount >= 10000 AND amount <= 50000000 AND amount = trunc(amount))
);
CREATE UNIQUE INDEX "wallet_top_ups_order_code_key" ON "wallet_top_ups"("order_code");
CREATE UNIQUE INDEX "wallet_top_ups_payment_link_id_key" ON "wallet_top_ups"("payment_link_id");
CREATE INDEX "wallet_top_ups_user_id_created_at_idx" ON "wallet_top_ups"("user_id", "created_at" DESC);
CREATE INDEX "wallet_top_ups_status_next_check_at_idx" ON "wallet_top_ups"("status", "next_check_at");
