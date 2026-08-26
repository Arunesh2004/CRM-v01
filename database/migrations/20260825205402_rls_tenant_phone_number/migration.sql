-- Enable Row-Level Security
ALTER TABLE "TenantPhoneNumber" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (though crm_app_user is not the owner)
ALTER TABLE "TenantPhoneNumber" FORCE ROW LEVEL SECURITY;

-- Create policy for SELECT
CREATE POLICY "tenant_phone_number_select_policy" ON "TenantPhoneNumber"
FOR SELECT
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)
);

-- Create policy for INSERT
CREATE POLICY "tenant_phone_number_insert_policy" ON "TenantPhoneNumber"
FOR INSERT
WITH CHECK (
  "tenantId"::text = current_setting('app.current_tenant_id', true)
);

-- Create policy for UPDATE
CREATE POLICY "tenant_phone_number_update_policy" ON "TenantPhoneNumber"
FOR UPDATE
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)
)
WITH CHECK (
  "tenantId"::text = current_setting('app.current_tenant_id', true)
);

-- Create policy for DELETE
CREATE POLICY "tenant_phone_number_delete_policy" ON "TenantPhoneNumber"
FOR DELETE
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)
);