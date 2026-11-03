CREATE TABLE finance_cost_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id),
 subject_type varchar(20) NOT NULL CHECK(subject_type IN ('ORDER','SAMPLE')), subject_id uuid NOT NULL,
 amount decimal(15,2) NOT NULL CHECK(amount>=0), evidence varchar(500) NOT NULL,
 recorded_by_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz(6) NOT NULL DEFAULT now(),
 UNIQUE(subject_type,subject_id)
);
CREATE INDEX finance_cost_entries_store_id_idx ON finance_cost_entries(store_id);
CREATE TABLE payout_tax_certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_id uuid NOT NULL UNIQUE REFERENCES payout_requests(id),
 issuer varchar(150) NOT NULL, certificate_number varchar(100) NOT NULL, issued_at timestamptz(6) NOT NULL,
 file_data bytea NOT NULL, sha256 varchar(64) NOT NULL,
 uploaded_by_id uuid NOT NULL REFERENCES users(id), created_at timestamptz(6) NOT NULL DEFAULT now(),
 UNIQUE(issuer,certificate_number)
);
