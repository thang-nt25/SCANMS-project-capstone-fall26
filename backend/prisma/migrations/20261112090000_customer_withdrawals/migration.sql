CREATE TABLE "customer_withdrawals" (
  "request_key" UUID NOT NULL UNIQUE,
"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL REFERENCES "users"("id"),
"amount" DECIMAL(15,2) NOT NULL CHECK (amount >= 200000), "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
"bank_name" VARCHAR(100) NOT NULL, "bank_account_number" VARCHAR(50) NOT NULL, "bank_account_name" VARCHAR(150) NOT NULL,
"bank_ref_code" VARCHAR(100) UNIQUE, "proof_public_id" TEXT, "proof_format" TEXT, "proof_hash" TEXT UNIQUE,
"note" TEXT, "processed_by" UUID REFERENCES "users"("id"), "processed_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "customer_withdrawals"("user_id", "created_at");
