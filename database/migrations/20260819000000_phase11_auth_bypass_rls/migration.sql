-- Drop the existing policy
DROP POLICY IF EXISTS tenant_isolation_policy_user ON "User";

-- Recreate it with a bypass check
CREATE POLICY tenant_isolation_policy_user ON "User" FOR ALL USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);
