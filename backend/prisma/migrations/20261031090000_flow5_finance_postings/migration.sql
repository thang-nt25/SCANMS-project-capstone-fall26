CREATE TABLE "finance_postings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_key" VARCHAR(150) NOT NULL,
  "reference_id" UUID NOT NULL,
  "reference_type" VARCHAR(30) NOT NULL,
  "debit_account" VARCHAR(60) NOT NULL,
  "credit_account" VARCHAR(60) NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "finance_postings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_postings_positive" CHECK ("amount" > 0),
  CONSTRAINT "finance_postings_accounts" CHECK ("debit_account" <> "credit_account")
);
CREATE UNIQUE INDEX "finance_postings_event_key_key" ON "finance_postings"("event_key");
CREATE INDEX "finance_postings_reference_id_idx" ON "finance_postings"("reference_id");
CREATE FUNCTION reject_finance_posting_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Finance postings are append-only; record a compensating entry'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER finance_postings_immutable BEFORE UPDATE OR DELETE ON finance_postings
FOR EACH ROW EXECUTE FUNCTION reject_finance_posting_mutation();
CREATE TRIGGER finance_postings_no_truncate BEFORE TRUNCATE ON finance_postings
FOR EACH STATEMENT EXECUTE FUNCTION reject_finance_posting_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON finance_postings FROM PUBLIC;
