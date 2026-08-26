-- Phase 12.3: Reproducibility Fix for RLS
-- Automatically generated script to ensure all RLS-enabled tenant-scoped tables
-- correctly respect app.bypass_rls for executeAsSystem().

-- ==========================================
-- Table: Customer
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_customer" ON "Customer";

CREATE POLICY tenant_isolation_policy_customer ON "Customer" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: CustomerContact
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_customercontact" ON "CustomerContact";

CREATE POLICY tenant_isolation_policy_customercontact ON "CustomerContact" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Lead
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_lead" ON "Lead";

CREATE POLICY tenant_isolation_policy_lead ON "Lead" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Deal
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_deal" ON "Deal";

CREATE POLICY tenant_isolation_policy_deal ON "Deal" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Task
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_task" ON "Task";

CREATE POLICY tenant_isolation_policy_task ON "Task" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Document
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_document" ON "Document";

CREATE POLICY tenant_isolation_policy_document ON "Document" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AuditLog
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_policy_auditlog" ON "AuditLog";

CREATE POLICY tenant_isolation_policy_auditlog ON "AuditLog" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: DocumentEmbedding
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_DocumentEmbedding" ON "DocumentEmbedding";

CREATE POLICY "tenant_isolation_DocumentEmbedding" ON "public"."DocumentEmbedding" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AIMemory
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_AIMemory" ON "AIMemory";

CREATE POLICY "tenant_isolation_AIMemory" ON "public"."AIMemory" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AIAgentExecution
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_AIAgentExecution" ON "AIAgentExecution";

CREATE POLICY "tenant_isolation_AIAgentExecution" ON "public"."AIAgentExecution" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AITokenUsage
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_AITokenUsage" ON "AITokenUsage";

CREATE POLICY "tenant_isolation_AITokenUsage" ON "public"."AITokenUsage" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AIProviderConfig
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_AIProviderConfig" ON "AIProviderConfig";

CREATE POLICY "tenant_isolation_AIProviderConfig" ON "public"."AIProviderConfig" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: AIReference
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_AIReference" ON "AIReference";

CREATE POLICY "tenant_isolation_AIReference" ON "public"."AIReference" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Workflow
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_Workflow" ON "Workflow";

CREATE POLICY "tenant_isolation_Workflow" ON "public"."Workflow" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: WorkflowTrigger
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_WorkflowTrigger" ON "WorkflowTrigger";

CREATE POLICY "tenant_isolation_WorkflowTrigger" ON "public"."WorkflowTrigger" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowTrigger"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: WorkflowAction
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_WorkflowAction" ON "WorkflowAction";

CREATE POLICY "tenant_isolation_WorkflowAction" ON "public"."WorkflowAction" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowAction"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: WorkflowExecution
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_WorkflowExecution" ON "WorkflowExecution";

CREATE POLICY "tenant_isolation_WorkflowExecution" ON "public"."WorkflowExecution" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowExecution"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: WorkflowExecutionStep
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_WorkflowExecutionStep" ON "WorkflowExecutionStep";

CREATE POLICY "tenant_isolation_WorkflowExecutionStep" ON "public"."WorkflowExecutionStep" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."WorkflowExecution" we JOIN "public"."Workflow" w ON w.id = we."workflowId" WHERE we.id = "WorkflowExecutionStep"."executionId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: ProductCategory
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for ProductCategory" ON "ProductCategory";

CREATE POLICY "Tenant isolation for ProductCategory" ON "ProductCategory"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: ProductFamily
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for ProductFamily" ON "ProductFamily";

CREATE POLICY "Tenant isolation for ProductFamily" ON "ProductFamily"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Product
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for Product" ON "Product";

CREATE POLICY "Tenant isolation for Product" ON "Product"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: PriceBook
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for PriceBook" ON "PriceBook";

CREATE POLICY "Tenant isolation for PriceBook" ON "PriceBook"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: PriceBookEntry
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for PriceBookEntry" ON "PriceBookEntry";

CREATE POLICY "Tenant isolation for PriceBookEntry" ON "PriceBookEntry"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: DiscountRule
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for DiscountRule" ON "DiscountRule";

CREATE POLICY "Tenant isolation for DiscountRule" ON "DiscountRule"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Quote
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for Quote" ON "Quote";

CREATE POLICY "Tenant isolation for Quote" ON "Quote"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: QuoteLineItem
-- ==========================================
DROP POLICY IF EXISTS "Tenant isolation for QuoteLineItem" ON "QuoteLineItem";

CREATE POLICY "Tenant isolation for QuoteLineItem" ON "QuoteLineItem"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Territory
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_territory" ON "Territory";

CREATE POLICY "tenant_isolation_territory" ON "Territory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: UserTerritory
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_user_territory" ON "UserTerritory";

CREATE POLICY "tenant_isolation_user_territory" ON "UserTerritory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: SalesQuota
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_sales_quota" ON "SalesQuota";

CREATE POLICY "tenant_isolation_sales_quota" ON "SalesQuota"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: DealSnapshot
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_deal_snapshot" ON "DealSnapshot";

CREATE POLICY "tenant_isolation_deal_snapshot" ON "DealSnapshot"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: FieldSecurityPolicy
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_FieldSecurityPolicy" ON "FieldSecurityPolicy";

CREATE POLICY "tenant_isolation_FieldSecurityPolicy" ON "FieldSecurityPolicy" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: ABACPolicy
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_ABACPolicy" ON "ABACPolicy";

CREATE POLICY "tenant_isolation_ABACPolicy" ON "ABACPolicy" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: ApprovalRequest
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_ApprovalRequest" ON "ApprovalRequest";

CREATE POLICY "tenant_isolation_ApprovalRequest" ON "ApprovalRequest" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: ApprovalStep
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_ApprovalStep" ON "ApprovalStep";

CREATE POLICY "tenant_isolation_ApprovalStep" ON "ApprovalStep" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: Ticket
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_Ticket" ON "Ticket";

CREATE POLICY "tenant_isolation_Ticket" ON "Ticket" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: TicketMessage
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_TicketMessage" ON "TicketMessage";

CREATE POLICY "tenant_isolation_TicketMessage" ON "TicketMessage" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: SLAConfiguration
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_SLAConfiguration" ON "SLAConfiguration";

CREATE POLICY "tenant_isolation_SLAConfiguration" ON "SLAConfiguration" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: SLAEvent
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_SLAEvent" ON "SLAEvent";

CREATE POLICY "tenant_isolation_SLAEvent" ON "SLAEvent" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: IdempotencyKey
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_idempotency_key" ON "IdempotencyKey";

CREATE POLICY "tenant_isolation_idempotency_key" ON "IdempotencyKey"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: DeadLetterQueue
-- ==========================================
DROP POLICY IF EXISTS "tenant_isolation_dlq" ON "DeadLetterQueue";

CREATE POLICY "tenant_isolation_dlq" ON "DeadLetterQueue"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: TenantPhoneNumber
-- ==========================================
DROP POLICY IF EXISTS "tenant_phone_number_select_policy" ON "TenantPhoneNumber";

-- Create policy for SELECT
CREATE POLICY "tenant_phone_number_select_policy" ON "TenantPhoneNumber"
FOR SELECT
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)

  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: TenantPhoneNumber
-- ==========================================
DROP POLICY IF EXISTS "tenant_phone_number_insert_policy" ON "TenantPhoneNumber";

-- Create policy for INSERT
CREATE POLICY "tenant_phone_number_insert_policy" ON "TenantPhoneNumber"
FOR INSERT
WITH CHECK (
  "tenantId"::text = current_setting('app.current_tenant_id', true)

  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: TenantPhoneNumber
-- ==========================================
DROP POLICY IF EXISTS "tenant_phone_number_update_policy" ON "TenantPhoneNumber";

-- Create policy for UPDATE
CREATE POLICY "tenant_phone_number_update_policy" ON "TenantPhoneNumber"
FOR UPDATE
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)

  OR current_setting('app.bypass_rls', true) = 'on')
WITH CHECK (
  "tenantId"::text = current_setting('app.current_tenant_id', true)

  OR current_setting('app.bypass_rls', true) = 'on');

-- ==========================================
-- Table: TenantPhoneNumber
-- ==========================================
DROP POLICY IF EXISTS "tenant_phone_number_delete_policy" ON "TenantPhoneNumber";

-- Create policy for DELETE
CREATE POLICY "tenant_phone_number_delete_policy" ON "TenantPhoneNumber"
FOR DELETE
USING (
  "tenantId"::text = current_setting('app.current_tenant_id', true)

  OR current_setting('app.bypass_rls', true) = 'on');

