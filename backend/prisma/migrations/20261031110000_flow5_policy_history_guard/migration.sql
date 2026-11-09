-- FR-09 historical reconstruction depends on immutable policy audit records.
CREATE OR REPLACE FUNCTION protect_commission_rule_audit() RETURNS trigger AS $$
BEGIN
  IF OLD.action IN ('CREATE_COMMISSION_RULE','UPDATE_COMMISSION_RULE','UPDATE_COMMISSION_RULE_STATUS','DELETE_COMMISSION_RULE','RESTORE_COMMISSION_RULE') THEN
    RAISE EXCEPTION 'Commission policy audit records are append-only';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER commission_rule_audit_immutable BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_commission_rule_audit();

CREATE OR REPLACE FUNCTION protect_commission_rule_audit_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit history cannot be truncated';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER commission_rule_audit_no_truncate BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION protect_commission_rule_audit_truncate();
CREATE INDEX IF NOT EXISTS idx_rule_history_lookup ON audit_logs ((details->>'storeId'), created_at)
WHERE action IN ('CREATE_COMMISSION_RULE','UPDATE_COMMISSION_RULE','UPDATE_COMMISSION_RULE_STATUS','DELETE_COMMISSION_RULE','RESTORE_COMMISSION_RULE');
