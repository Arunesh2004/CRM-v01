-- 1. Enable RLS and FORCE RLS on critical tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CustomerContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;



ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- 2. Create the policies
CREATE POLICY tenant_isolation_policy_user ON "User" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_customer ON "Customer" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_customercontact ON "CustomerContact" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_lead ON "Lead" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_deal ON "Deal" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_task ON "Task" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_policy_document ON "Document" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
CREATE POLICY tenant_isolation_policy_auditlog ON "AuditLog" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- 3. Create restricted background worker role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crm_background_worker') THEN
    CREATE ROLE crm_background_worker BYPASSRLS;
  END IF;
END
$$;
