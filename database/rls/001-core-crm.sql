-- DESIGN ARTIFACTS - NOT SAFE TO EXECUTE UNTIL SCHEMA PARITY IS ESTABLISHED.  
-- DESIGN ONLY
-- DO NOT EXECUTE
-- PHASE 4B
-- RLS migration has NOT been approved for deployment

-- ==========================================
-- POLICY FOR TenantBootstrap
-- ==========================================
ALTER TABLE "TenantBootstrap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantBootstrap" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_tenantbootstrap" ON "TenantBootstrap"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_tenantbootstrap" ON "TenantBootstrap"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_tenantbootstrap" ON "TenantBootstrap"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_tenantbootstrap" ON "TenantBootstrap"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Department
-- ==========================================
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_department" ON "Department"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_department" ON "Department"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_department" ON "Department"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_department" ON "Department"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR User
-- ==========================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_user" ON "User"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_user" ON "User"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_user" ON "User"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_user" ON "User"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DeviceSession
-- ==========================================
ALTER TABLE "DeviceSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_devicesession" ON "DeviceSession"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_devicesession" ON "DeviceSession"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_devicesession" ON "DeviceSession"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_devicesession" ON "DeviceSession"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Role
-- ==========================================
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_role" ON "Role"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_role" ON "Role"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_role" ON "Role"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_role" ON "Role"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR RolePermission
-- ==========================================
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_rolepermission" ON "RolePermission"
FOR SELECT USING (
  ( EXISTS (
    SELECT 1 FROM "Role" p
    WHERE p.id = "roleId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_rolepermission" ON "RolePermission"
FOR INSERT WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Role" p
    WHERE p.id = "roleId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_rolepermission" ON "RolePermission"
FOR UPDATE USING (
  ( EXISTS (
    SELECT 1 FROM "Role" p
    WHERE p.id = "roleId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Role" p
    WHERE p.id = "roleId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_rolepermission" ON "RolePermission"
FOR DELETE USING (
  ( EXISTS (
    SELECT 1 FROM "Role" p
    WHERE p.id = "roleId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR UserRole
-- ==========================================
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_userrole" ON "UserRole"
FOR SELECT USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "userId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_userrole" ON "UserRole"
FOR INSERT WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "userId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_userrole" ON "UserRole"
FOR UPDATE USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "userId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "userId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_userrole" ON "UserRole"
FOR DELETE USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "userId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR TenantIntegration
-- ==========================================
ALTER TABLE "TenantIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_tenantintegration" ON "TenantIntegration"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_tenantintegration" ON "TenantIntegration"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_tenantintegration" ON "TenantIntegration"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_tenantintegration" ON "TenantIntegration"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Lead
-- ==========================================
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_lead" ON "Lead"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_lead" ON "Lead"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_lead" ON "Lead"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_lead" ON "Lead"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Customer
-- ==========================================
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_customer" ON "Customer"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_customer" ON "Customer"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_customer" ON "Customer"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_customer" ON "Customer"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CustomerContact
-- ==========================================
ALTER TABLE "CustomerContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_customercontact" ON "CustomerContact"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_customercontact" ON "CustomerContact"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_customercontact" ON "CustomerContact"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_customercontact" ON "CustomerContact"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Location
-- ==========================================
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_location" ON "Location"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_location" ON "Location"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_location" ON "Location"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_location" ON "Location"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Task
-- ==========================================
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_task" ON "Task"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_task" ON "Task"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_task" ON "Task"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_task" ON "Task"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CRMComment
-- ==========================================
ALTER TABLE "CRMComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_crmcomment" ON "CRMComment"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_crmcomment" ON "CRMComment"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_crmcomment" ON "CRMComment"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_crmcomment" ON "CRMComment"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ActivityTimeline
-- ==========================================
ALTER TABLE "ActivityTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_activitytimeline" ON "ActivityTimeline"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_activitytimeline" ON "ActivityTimeline"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_activitytimeline" ON "ActivityTimeline"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_activitytimeline" ON "ActivityTimeline"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DemoStorage
-- ==========================================
ALTER TABLE "DemoStorage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_demostorage" ON "DemoStorage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_demostorage" ON "DemoStorage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_demostorage" ON "DemoStorage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_demostorage" ON "DemoStorage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Document
-- ==========================================
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_document" ON "Document"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_document" ON "Document"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_document" ON "Document"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_document" ON "Document"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Notification
-- ==========================================
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_notification" ON "Notification"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_notification" ON "Notification"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_notification" ON "Notification"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_notification" ON "Notification"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR NotificationPreference
-- ==========================================
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_notificationpreference" ON "NotificationPreference"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_notificationpreference" ON "NotificationPreference"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_notificationpreference" ON "NotificationPreference"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_notificationpreference" ON "NotificationPreference"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Camera
-- ==========================================
ALTER TABLE "Camera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_camera" ON "Camera"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_camera" ON "Camera"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_camera" ON "Camera"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_camera" ON "Camera"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CameraCredential
-- ==========================================
ALTER TABLE "CameraCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_cameracredential" ON "CameraCredential"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_cameracredential" ON "CameraCredential"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_cameracredential" ON "CameraCredential"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_cameracredential" ON "CameraCredential"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CameraStream
-- ==========================================
ALTER TABLE "CameraStream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_camerastream" ON "CameraStream"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_camerastream" ON "CameraStream"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_camerastream" ON "CameraStream"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_camerastream" ON "CameraStream"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Recording
-- ==========================================
ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_recording" ON "Recording"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_recording" ON "Recording"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_recording" ON "Recording"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_recording" ON "Recording"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR CommunicationAttachment
-- ==========================================
ALTER TABLE "CommunicationAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunicationAttachment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_communicationattachment" ON "CommunicationAttachment"
FOR SELECT USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "uploaderId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_communicationattachment" ON "CommunicationAttachment"
FOR INSERT WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "uploaderId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_communicationattachment" ON "CommunicationAttachment"
FOR UPDATE USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "uploaderId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "uploaderId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_communicationattachment" ON "CommunicationAttachment"
FOR DELETE USING (
  ( EXISTS (
    SELECT 1 FROM "User" p
    WHERE p.id = "uploaderId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR UserPresence
-- ==========================================
ALTER TABLE "UserPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPresence" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_userpresence" ON "UserPresence"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_userpresence" ON "UserPresence"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_userpresence" ON "UserPresence"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_userpresence" ON "UserPresence"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Incident
-- ==========================================
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_incident" ON "Incident"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_incident" ON "Incident"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_incident" ON "Incident"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_incident" ON "Incident"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR RecoveryJob
-- ==========================================
ALTER TABLE "RecoveryJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryJob" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_recoveryjob" ON "RecoveryJob"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_recoveryjob" ON "RecoveryJob"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_recoveryjob" ON "RecoveryJob"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_recoveryjob" ON "RecoveryJob"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR RecoverySnapshot
-- ==========================================
ALTER TABLE "RecoverySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoverySnapshot" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_recoverysnapshot" ON "RecoverySnapshot"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_recoverysnapshot" ON "RecoverySnapshot"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_recoverysnapshot" ON "RecoverySnapshot"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_recoverysnapshot" ON "RecoverySnapshot"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR RestoreCheckpoint
-- ==========================================
ALTER TABLE "RestoreCheckpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestoreCheckpoint" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_restorecheckpoint" ON "RestoreCheckpoint"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_restorecheckpoint" ON "RestoreCheckpoint"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_restorecheckpoint" ON "RestoreCheckpoint"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_restorecheckpoint" ON "RestoreCheckpoint"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Pipeline
-- ==========================================
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_pipeline" ON "Pipeline"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_pipeline" ON "Pipeline"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_pipeline" ON "Pipeline"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_pipeline" ON "Pipeline"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR PipelineStage
-- ==========================================
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_pipelinestage" ON "PipelineStage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_pipelinestage" ON "PipelineStage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_pipelinestage" ON "PipelineStage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_pipelinestage" ON "PipelineStage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Deal
-- ==========================================
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_deal" ON "Deal"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_deal" ON "Deal"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_deal" ON "Deal"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_deal" ON "Deal"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DealStageHistory
-- ==========================================
ALTER TABLE "DealStageHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealStageHistory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_dealstagehistory" ON "DealStageHistory"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_dealstagehistory" ON "DealStageHistory"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_dealstagehistory" ON "DealStageHistory"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_dealstagehistory" ON "DealStageHistory"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DocumentEmbedding
-- ==========================================
ALTER TABLE "DocumentEmbedding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEmbedding" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_documentembedding" ON "DocumentEmbedding"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_documentembedding" ON "DocumentEmbedding"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_documentembedding" ON "DocumentEmbedding"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_documentembedding" ON "DocumentEmbedding"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DocumentPermission
-- ==========================================
ALTER TABLE "DocumentPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentPermission" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_documentpermission" ON "DocumentPermission"
FOR SELECT USING (
  ( EXISTS (
    SELECT 1 FROM "Document" p
    WHERE p.id = "documentId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_documentpermission" ON "DocumentPermission"
FOR INSERT WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Document" p
    WHERE p.id = "documentId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_documentpermission" ON "DocumentPermission"
FOR UPDATE USING (
  ( EXISTS (
    SELECT 1 FROM "Document" p
    WHERE p.id = "documentId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Document" p
    WHERE p.id = "documentId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_documentpermission" ON "DocumentPermission"
FOR DELETE USING (
  ( EXISTS (
    SELECT 1 FROM "Document" p
    WHERE p.id = "documentId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Workflow
-- ==========================================
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_workflow" ON "Workflow"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_workflow" ON "Workflow"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_workflow" ON "Workflow"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_workflow" ON "Workflow"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR WorkflowTrigger
-- ==========================================
ALTER TABLE "WorkflowTrigger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowTrigger" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_workflowtrigger" ON "WorkflowTrigger"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_workflowtrigger" ON "WorkflowTrigger"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_workflowtrigger" ON "WorkflowTrigger"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_workflowtrigger" ON "WorkflowTrigger"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR WorkflowAction
-- ==========================================
ALTER TABLE "WorkflowAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAction" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_workflowaction" ON "WorkflowAction"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_workflowaction" ON "WorkflowAction"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_workflowaction" ON "WorkflowAction"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_workflowaction" ON "WorkflowAction"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR WorkflowExecution
-- ==========================================
ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_workflowexecution" ON "WorkflowExecution"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_workflowexecution" ON "WorkflowExecution"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_workflowexecution" ON "WorkflowExecution"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_workflowexecution" ON "WorkflowExecution"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR WorkflowExecutionStep
-- ==========================================
ALTER TABLE "WorkflowExecutionStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecutionStep" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_workflowexecutionstep" ON "WorkflowExecutionStep"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_workflowexecutionstep" ON "WorkflowExecutionStep"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_workflowexecutionstep" ON "WorkflowExecutionStep"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_workflowexecutionstep" ON "WorkflowExecutionStep"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ProductCategory
-- ==========================================
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_productcategory" ON "ProductCategory"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_productcategory" ON "ProductCategory"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_productcategory" ON "ProductCategory"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_productcategory" ON "ProductCategory"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ProductFamily
-- ==========================================
ALTER TABLE "ProductFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_productfamily" ON "ProductFamily"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_productfamily" ON "ProductFamily"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_productfamily" ON "ProductFamily"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_productfamily" ON "ProductFamily"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Product
-- ==========================================
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_product" ON "Product"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_product" ON "Product"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_product" ON "Product"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_product" ON "Product"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR PriceBook
-- ==========================================
ALTER TABLE "PriceBook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_pricebook" ON "PriceBook"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_pricebook" ON "PriceBook"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_pricebook" ON "PriceBook"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_pricebook" ON "PriceBook"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR PriceBookEntry
-- ==========================================
ALTER TABLE "PriceBookEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_pricebookentry" ON "PriceBookEntry"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_pricebookentry" ON "PriceBookEntry"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_pricebookentry" ON "PriceBookEntry"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_pricebookentry" ON "PriceBookEntry"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DiscountRule
-- ==========================================
ALTER TABLE "DiscountRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_discountrule" ON "DiscountRule"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_discountrule" ON "DiscountRule"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_discountrule" ON "DiscountRule"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_discountrule" ON "DiscountRule"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Quote
-- ==========================================
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_quote" ON "Quote"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_quote" ON "Quote"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_quote" ON "Quote"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_quote" ON "Quote"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR QuoteLineItem
-- ==========================================
ALTER TABLE "QuoteLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_quotelineitem" ON "QuoteLineItem"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_quotelineitem" ON "QuoteLineItem"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_quotelineitem" ON "QuoteLineItem"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_quotelineitem" ON "QuoteLineItem"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Territory
-- ==========================================
ALTER TABLE "Territory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_territory" ON "Territory"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_territory" ON "Territory"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_territory" ON "Territory"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_territory" ON "Territory"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR UserTerritory
-- ==========================================
ALTER TABLE "UserTerritory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_userterritory" ON "UserTerritory"
FOR SELECT USING (
  ( EXISTS (
    SELECT 1 FROM "Territory" p
    WHERE p.id = "territoryId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_userterritory" ON "UserTerritory"
FOR INSERT WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Territory" p
    WHERE p.id = "territoryId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_userterritory" ON "UserTerritory"
FOR UPDATE USING (
  ( EXISTS (
    SELECT 1 FROM "Territory" p
    WHERE p.id = "territoryId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  ( EXISTS (
    SELECT 1 FROM "Territory" p
    WHERE p.id = "territoryId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_userterritory" ON "UserTerritory"
FOR DELETE USING (
  ( EXISTS (
    SELECT 1 FROM "Territory" p
    WHERE p.id = "territoryId"
      AND p."tenantId" = current_setting('app.current_tenant_id', true)::text
  ) )
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR SalesQuota
-- ==========================================
ALTER TABLE "SalesQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_salesquota" ON "SalesQuota"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_salesquota" ON "SalesQuota"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_salesquota" ON "SalesQuota"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_salesquota" ON "SalesQuota"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DealSnapshot
-- ==========================================
ALTER TABLE "DealSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_dealsnapshot" ON "DealSnapshot"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_dealsnapshot" ON "DealSnapshot"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_dealsnapshot" ON "DealSnapshot"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_dealsnapshot" ON "DealSnapshot"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR FieldSecurityPolicy
-- ==========================================
ALTER TABLE "FieldSecurityPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_fieldsecuritypolicy" ON "FieldSecurityPolicy"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_fieldsecuritypolicy" ON "FieldSecurityPolicy"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_fieldsecuritypolicy" ON "FieldSecurityPolicy"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_fieldsecuritypolicy" ON "FieldSecurityPolicy"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ABACPolicy
-- ==========================================
ALTER TABLE "ABACPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ABACPolicy" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_abacpolicy" ON "ABACPolicy"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_abacpolicy" ON "ABACPolicy"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_abacpolicy" ON "ABACPolicy"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_abacpolicy" ON "ABACPolicy"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ApprovalRequest
-- ==========================================
ALTER TABLE "ApprovalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_approvalrequest" ON "ApprovalRequest"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_approvalrequest" ON "ApprovalRequest"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_approvalrequest" ON "ApprovalRequest"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_approvalrequest" ON "ApprovalRequest"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR ApprovalStep
-- ==========================================
ALTER TABLE "ApprovalStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_approvalstep" ON "ApprovalStep"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_approvalstep" ON "ApprovalStep"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_approvalstep" ON "ApprovalStep"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_approvalstep" ON "ApprovalStep"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Ticket
-- ==========================================
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_ticket" ON "Ticket"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_ticket" ON "Ticket"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_ticket" ON "Ticket"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_ticket" ON "Ticket"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR TicketMessage
-- ==========================================
ALTER TABLE "TicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_ticketmessage" ON "TicketMessage"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_ticketmessage" ON "TicketMessage"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_ticketmessage" ON "TicketMessage"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_ticketmessage" ON "TicketMessage"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR SLAConfiguration
-- ==========================================
ALTER TABLE "SLAConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_slaconfiguration" ON "SLAConfiguration"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_slaconfiguration" ON "SLAConfiguration"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_slaconfiguration" ON "SLAConfiguration"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_slaconfiguration" ON "SLAConfiguration"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR IdempotencyKey
-- ==========================================
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_idempotencykey" ON "IdempotencyKey"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_idempotencykey" ON "IdempotencyKey"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_idempotencykey" ON "IdempotencyKey"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_idempotencykey" ON "IdempotencyKey"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR DeadLetterQueue
-- ==========================================
ALTER TABLE "DeadLetterQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_deadletterqueue" ON "DeadLetterQueue"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_deadletterqueue" ON "DeadLetterQueue"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_deadletterqueue" ON "DeadLetterQueue"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_deadletterqueue" ON "DeadLetterQueue"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Subscription
-- ==========================================
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_subscription" ON "Subscription"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_subscription" ON "Subscription"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_subscription" ON "Subscription"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_subscription" ON "Subscription"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

-- ==========================================
-- POLICY FOR Invoice
-- ==========================================
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_invoice" ON "Invoice"
FOR SELECT USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_insert_invoice" ON "Invoice"
FOR INSERT WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_update_invoice" ON "Invoice"
FOR UPDATE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
) WITH CHECK (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

CREATE POLICY "tenant_isolation_delete_invoice" ON "Invoice"
FOR DELETE USING (
  "tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on'
);

