-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "transaction_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "payment_method" VARCHAR(50) NOT NULL,
    "payment_proof" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_transaction_id_key" ON "payment_transactions"("transaction_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_fk_payment_transactions_order" ON "payment_transactions"("order_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_order_id_fkey'
    ) THEN
        ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
