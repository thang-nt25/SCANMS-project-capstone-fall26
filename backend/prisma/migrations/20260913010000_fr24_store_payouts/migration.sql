-- FR-24: additive store balances and reviewed payout processing.
-- Do not assign legacy balances/payouts to arbitrary shops.
BEGIN;

-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "store_wallet_tracked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "financial_ledgers" ADD COLUMN     "store_balance_after" DECIMAL(15,2),
ADD COLUMN     "store_balance_before" DECIMAL(15,2),
ADD COLUMN     "store_id" UUID;

-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "batch_id" UUID,
ADD COLUMN     "proof_image_format" VARCHAR(10),
ADD COLUMN     "proof_image_public_id" TEXT,
ADD COLUMN     "proof_image_sha256" VARCHAR(64);

-- CreateTable
CREATE TABLE "store_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "available_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "pending_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_data" BYTEA NOT NULL,

    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_store_wallets_store" ON "store_wallets"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_store_wallets_wallet_store" ON "store_wallets"("wallet_id", "store_id");

-- CreateIndex
CREATE INDEX "idx_payout_batches_store_date" ON "payout_batches"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_payout_batches_creator" ON "payout_batches"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_ledgers_store_date" ON "financial_ledgers"("store_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_payouts_unique_bill_hash" ON "payout_requests"("proof_image_sha256");

-- CreateIndex
CREATE INDEX "idx_payouts_approver" ON "payout_requests"("approved_by_id");

-- CreateIndex
CREATE INDEX "idx_payouts_batch" ON "payout_requests"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_payouts_store_bank_ref" ON "payout_requests"("store_id", "bank_ref_code");

-- AddForeignKey
ALTER TABLE "financial_ledgers" ADD CONSTRAINT "financial_ledgers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_wallets" ADD CONSTRAINT "store_wallets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_wallets" ADD CONSTRAINT "store_wallets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Ledger history remains append-only. New scoped entries also balance per shop.
ALTER TABLE "financial_ledgers" ADD CONSTRAINT "financial_ledgers_store_balance_check"
  CHECK (
    ("store_id" IS NULL AND "store_balance_before" IS NULL AND "store_balance_after" IS NULL)
    OR ("store_id" IS NOT NULL AND "store_balance_before" IS NOT NULL AND "store_balance_after" IS NOT NULL
      AND "store_balance_after" = "store_balance_before" + "amount")
  ) NOT VALID;
ALTER TABLE "store_wallets" ADD CONSTRAINT "store_wallets_pending_nonnegative_check" CHECK ("pending_balance" >= 0);
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_processing_batch_check"
  CHECK ("status"::text <> 'PROCESSING' OR "batch_id" IS NOT NULL) NOT VALID;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payouts_approval_proof_check"
  CHECK ("status"::text <> 'APPROVED' OR
    ("store_id" IS NOT NULL AND "approved_by_id" IS NOT NULL AND "proof_image_public_id" IS NOT NULL
     AND "proof_image_format" IS NOT NULL AND "proof_image_sha256" IS NOT NULL
     AND "bank_ref_code" IS NOT NULL AND "processed_at" IS NOT NULL)) NOT VALID;
COMMIT;
