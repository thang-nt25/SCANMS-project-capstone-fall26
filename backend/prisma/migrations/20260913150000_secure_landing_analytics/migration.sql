ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "event_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_event_id_key"
  ON "audit_logs"("event_id");
