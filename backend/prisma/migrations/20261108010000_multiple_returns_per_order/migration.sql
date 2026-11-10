DROP INDEX IF EXISTS "return_requests_order_id_key";
CREATE INDEX IF NOT EXISTS "idx_return_requests_order_submitted"
  ON "return_requests" ("order_id", "submitted_at");
