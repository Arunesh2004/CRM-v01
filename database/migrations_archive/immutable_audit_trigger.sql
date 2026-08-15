-- Enforce immutability on RecoveryAuditLog
-- Block UPDATE and DELETE operations

CREATE OR REPLACE FUNCTION prevent_recovery_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updates to RecoveryAuditLog are strictly forbidden for forensic integrity.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletions from RecoveryAuditLog are strictly forbidden for forensic integrity.';
    ELSIF TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION 'Truncating RecoveryAuditLog is strictly forbidden for forensic integrity.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_recovery_audit_log_immutability ON "RecoveryAuditLog";

CREATE TRIGGER enforce_recovery_audit_log_immutability
BEFORE UPDATE OR DELETE ON "RecoveryAuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_recovery_audit_log_modification();

-- Note: TRUNCATE triggers in Postgres are statement-level, but `FOR EACH ROW` ignores TRUNCATE.
-- Let's create a statement-level trigger for TRUNCATE.

DROP TRIGGER IF EXISTS enforce_recovery_audit_log_truncate ON "RecoveryAuditLog";

CREATE TRIGGER enforce_recovery_audit_log_truncate
BEFORE TRUNCATE ON "RecoveryAuditLog"
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_recovery_audit_log_modification();
