CREATE TABLE "platform_voucher_reimbursements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "store_id" UUID NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "bank_reference" VARCHAR(100) NOT NULL,
  "marked_by" UUID NOT NULL,
  "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_voucher_reimbursements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_voucher_reimbursements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "platform_voucher_reimbursements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "platform_voucher_reimbursements_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "platform_voucher_reimbursements_amount_positive" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "uq_platform_voucher_reimburse_order_ref" ON "platform_voucher_reimbursements"("order_id", "bank_reference");
CREATE INDEX "idx_platform_voucher_reimburse_store_date" ON "platform_voucher_reimbursements"("store_id", "paid_at");
