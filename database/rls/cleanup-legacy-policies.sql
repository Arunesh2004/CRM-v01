-- RLS LEGACY POLICY CLEANUP SCRIPT
-- PHASE 6C-LEGACY-RLS-F

-- Removing legacy policy tenant_isolation_ABACPolicy from ABACPolicy
DROP POLICY IF EXISTS "tenant_isolation_ABACPolicy" ON "ABACPolicy";
-- Removing legacy policy tenant_isolation_AIAgentExecution from AIAgentExecution
DROP POLICY IF EXISTS "tenant_isolation_AIAgentExecution" ON "AIAgentExecution";
-- Removing legacy policy tenant_isolation_AIMemory from AIMemory
DROP POLICY IF EXISTS "tenant_isolation_AIMemory" ON "AIMemory";
-- Removing legacy policy tenant_isolation_AIProviderConfig from AIProviderConfig
DROP POLICY IF EXISTS "tenant_isolation_AIProviderConfig" ON "AIProviderConfig";
-- Removing legacy policy tenant_isolation_AIReference from AIReference
DROP POLICY IF EXISTS "tenant_isolation_AIReference" ON "AIReference";
-- Removing legacy policy tenant_isolation_AITokenUsage from AITokenUsage
DROP POLICY IF EXISTS "tenant_isolation_AITokenUsage" ON "AITokenUsage";
-- Removing legacy policy tenant_isolation_select_activitytimeline from ActivityTimeline
DROP POLICY IF EXISTS "tenant_isolation_select_activitytimeline" ON "ActivityTimeline";
-- Removing legacy policy tenant_isolation_ApprovalRequest from ApprovalRequest
DROP POLICY IF EXISTS "tenant_isolation_ApprovalRequest" ON "ApprovalRequest";
-- Removing legacy policy tenant_isolation_ApprovalStep from ApprovalStep
DROP POLICY IF EXISTS "tenant_isolation_ApprovalStep" ON "ApprovalStep";
-- Removing legacy policy tenant_isolation_policy_auditlog from AuditLog
DROP POLICY IF EXISTS "tenant_isolation_policy_auditlog" ON "AuditLog";
-- Removing legacy policy tenant_isolation_select_crmcomment from CRMComment
DROP POLICY IF EXISTS "tenant_isolation_select_crmcomment" ON "CRMComment";
-- Removing legacy policy tenant_isolation_select_camera from Camera
DROP POLICY IF EXISTS "tenant_isolation_select_camera" ON "Camera";
-- Removing legacy policy tenant_isolation_select_cameracredential from CameraCredential
DROP POLICY IF EXISTS "tenant_isolation_select_cameracredential" ON "CameraCredential";
-- Removing legacy policy tenant_isolation_select_camerastream from CameraStream
DROP POLICY IF EXISTS "tenant_isolation_select_camerastream" ON "CameraStream";
-- Removing legacy policy tenant_isolation_policy_customer from Customer
DROP POLICY IF EXISTS "tenant_isolation_policy_customer" ON "Customer";
-- Removing legacy policy tenant_isolation_select_customer from Customer
DROP POLICY IF EXISTS "tenant_isolation_select_customer" ON "Customer";
-- Removing legacy policy tenant_isolation_policy_customercontact from CustomerContact
DROP POLICY IF EXISTS "tenant_isolation_policy_customercontact" ON "CustomerContact";
-- Removing legacy policy tenant_isolation_select_customercontact from CustomerContact
DROP POLICY IF EXISTS "tenant_isolation_select_customercontact" ON "CustomerContact";
-- Removing legacy policy tenant_isolation_dlq from DeadLetterQueue
DROP POLICY IF EXISTS "tenant_isolation_dlq" ON "DeadLetterQueue";
-- Removing legacy policy tenant_isolation_policy_deal from Deal
DROP POLICY IF EXISTS "tenant_isolation_policy_deal" ON "Deal";
-- Removing legacy policy tenant_isolation_deal_snapshot from DealSnapshot
DROP POLICY IF EXISTS "tenant_isolation_deal_snapshot" ON "DealSnapshot";
-- Removing legacy policy tenant_isolation_select_demostorage from DemoStorage
DROP POLICY IF EXISTS "tenant_isolation_select_demostorage" ON "DemoStorage";
-- Removing legacy policy tenant_isolation_select_department from Department
DROP POLICY IF EXISTS "tenant_isolation_select_department" ON "Department";
-- Removing legacy policy tenant_isolation_select_devicesession from DeviceSession
DROP POLICY IF EXISTS "tenant_isolation_select_devicesession" ON "DeviceSession";
-- Removing legacy policy Tenant isolation for DiscountRule from DiscountRule
DROP POLICY IF EXISTS "Tenant isolation for DiscountRule" ON "DiscountRule";
-- Removing legacy policy tenant_isolation_policy_document from Document
DROP POLICY IF EXISTS "tenant_isolation_policy_document" ON "Document";
-- Removing legacy policy tenant_isolation_select_document from Document
DROP POLICY IF EXISTS "tenant_isolation_select_document" ON "Document";
-- Removing legacy policy tenant_isolation_DocumentEmbedding from DocumentEmbedding
DROP POLICY IF EXISTS "tenant_isolation_DocumentEmbedding" ON "DocumentEmbedding";
-- Removing legacy policy tenant_isolation_FieldSecurityPolicy from FieldSecurityPolicy
DROP POLICY IF EXISTS "tenant_isolation_FieldSecurityPolicy" ON "FieldSecurityPolicy";
-- Removing legacy policy tenant_isolation_idempotency_key from IdempotencyKey
DROP POLICY IF EXISTS "tenant_isolation_idempotency_key" ON "IdempotencyKey";
-- Removing legacy policy tenant_isolation_policy_lead from Lead
DROP POLICY IF EXISTS "tenant_isolation_policy_lead" ON "Lead";
-- Removing legacy policy tenant_isolation_select_lead from Lead
DROP POLICY IF EXISTS "tenant_isolation_select_lead" ON "Lead";
-- Removing legacy policy tenant_isolation_select_location from Location
DROP POLICY IF EXISTS "tenant_isolation_select_location" ON "Location";
-- Removing legacy policy tenant_isolation_select_notification from Notification
DROP POLICY IF EXISTS "tenant_isolation_select_notification" ON "Notification";
-- Removing legacy policy tenant_isolation_select_notificationpreference from NotificationPreference
DROP POLICY IF EXISTS "tenant_isolation_select_notificationpreference" ON "NotificationPreference";
-- Removing legacy policy Tenant isolation for PriceBook from PriceBook
DROP POLICY IF EXISTS "Tenant isolation for PriceBook" ON "PriceBook";
-- Removing legacy policy Tenant isolation for PriceBookEntry from PriceBookEntry
DROP POLICY IF EXISTS "Tenant isolation for PriceBookEntry" ON "PriceBookEntry";
-- Removing legacy policy Tenant isolation for Product from Product
DROP POLICY IF EXISTS "Tenant isolation for Product" ON "Product";
-- Removing legacy policy Tenant isolation for ProductCategory from ProductCategory
DROP POLICY IF EXISTS "Tenant isolation for ProductCategory" ON "ProductCategory";
-- Removing legacy policy Tenant isolation for ProductFamily from ProductFamily
DROP POLICY IF EXISTS "Tenant isolation for ProductFamily" ON "ProductFamily";
-- Removing legacy policy Tenant isolation for Quote from Quote
DROP POLICY IF EXISTS "Tenant isolation for Quote" ON "Quote";
-- Removing legacy policy Tenant isolation for QuoteLineItem from QuoteLineItem
DROP POLICY IF EXISTS "Tenant isolation for QuoteLineItem" ON "QuoteLineItem";
-- Removing legacy policy tenant_isolation_select_recording from Recording
DROP POLICY IF EXISTS "tenant_isolation_select_recording" ON "Recording";
-- Removing legacy policy tenant_isolation_select_role from Role
DROP POLICY IF EXISTS "tenant_isolation_select_role" ON "Role";
-- Removing legacy policy tenant_isolation_select_rolepermission from RolePermission
DROP POLICY IF EXISTS "tenant_isolation_select_rolepermission" ON "RolePermission";
-- Removing legacy policy tenant_isolation_SLAConfiguration from SLAConfiguration
DROP POLICY IF EXISTS "tenant_isolation_SLAConfiguration" ON "SLAConfiguration";
-- Removing legacy policy tenant_isolation_SLAEvent from SLAEvent
DROP POLICY IF EXISTS "tenant_isolation_SLAEvent" ON "SLAEvent";
-- Removing legacy policy tenant_isolation_sales_quota from SalesQuota
DROP POLICY IF EXISTS "tenant_isolation_sales_quota" ON "SalesQuota";
-- Removing legacy policy tenant_isolation_policy_task from Task
DROP POLICY IF EXISTS "tenant_isolation_policy_task" ON "Task";
-- Removing legacy policy tenant_isolation_select_task from Task
DROP POLICY IF EXISTS "tenant_isolation_select_task" ON "Task";
-- Removing legacy policy tenant_isolation_select_tenantbootstrap from TenantBootstrap
DROP POLICY IF EXISTS "tenant_isolation_select_tenantbootstrap" ON "TenantBootstrap";
-- Removing legacy policy tenant_isolation_select_tenantintegration from TenantIntegration
DROP POLICY IF EXISTS "tenant_isolation_select_tenantintegration" ON "TenantIntegration";
-- Removing legacy policy tenant_isolation_territory from Territory
DROP POLICY IF EXISTS "tenant_isolation_territory" ON "Territory";
-- Removing legacy policy tenant_isolation_Ticket from Ticket
DROP POLICY IF EXISTS "tenant_isolation_Ticket" ON "Ticket";
-- Removing legacy policy tenant_isolation_TicketMessage from TicketMessage
DROP POLICY IF EXISTS "tenant_isolation_TicketMessage" ON "TicketMessage";
-- Removing legacy policy tenant_isolation_policy_user from User
DROP POLICY IF EXISTS "tenant_isolation_policy_user" ON "User";
-- Removing legacy policy tenant_isolation_select_user from User
DROP POLICY IF EXISTS "tenant_isolation_select_user" ON "User";
-- Removing legacy policy tenant_isolation_select_userrole from UserRole
DROP POLICY IF EXISTS "tenant_isolation_select_userrole" ON "UserRole";
-- Removing legacy policy tenant_isolation_user_territory from UserTerritory
DROP POLICY IF EXISTS "tenant_isolation_user_territory" ON "UserTerritory";
-- Removing legacy policy tenant_isolation_Workflow from Workflow
DROP POLICY IF EXISTS "tenant_isolation_Workflow" ON "Workflow";
-- Removing legacy policy tenant_isolation_WorkflowAction from WorkflowAction
DROP POLICY IF EXISTS "tenant_isolation_WorkflowAction" ON "WorkflowAction";
-- Removing legacy policy tenant_isolation_WorkflowExecution from WorkflowExecution
DROP POLICY IF EXISTS "tenant_isolation_WorkflowExecution" ON "WorkflowExecution";
-- Removing legacy policy tenant_isolation_WorkflowExecutionStep from WorkflowExecutionStep
DROP POLICY IF EXISTS "tenant_isolation_WorkflowExecutionStep" ON "WorkflowExecutionStep";
-- Removing legacy policy tenant_isolation_WorkflowTrigger from WorkflowTrigger
DROP POLICY IF EXISTS "tenant_isolation_WorkflowTrigger" ON "WorkflowTrigger";

-- Disabling RLS on tables cleared of legacy policies to reset to baseline
ALTER TABLE "ABACPolicy" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ABACPolicy" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AIAgentExecution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIAgentExecution" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AIMemory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIMemory" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIProviderConfig" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AIReference" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AIReference" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AITokenUsage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AITokenUsage" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTimeline" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CRMComment" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Camera" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraCredential" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraStream" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerContact" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Deal" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DemoStorage" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Department" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceSession" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountRule" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEmbedding" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentEmbedding" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Lead" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Location" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBook" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceBookEntry" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFamily" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Quote" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteLineItem" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Recording" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Role" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Task" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantBootstrap" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantBootstrap" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantIntegration" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Territory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowAction" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecutionStep" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecutionStep" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowTrigger" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowTrigger" NO FORCE ROW LEVEL SECURITY;
