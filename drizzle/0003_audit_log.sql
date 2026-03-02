-- Audit log table (§7.3 compliance: append-only with user, action, entity, before/after state, timestamp)
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "user_email" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "before_state" jsonb,
  "after_state" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_log_user_id" ON "audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity" ON "audit_log" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_created_at" ON "audit_log" ("created_at");

-- Append-only protection: prevent UPDATE and DELETE on audit_log rows
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();
