const fs = require('fs');

const directTenantTables = [
  'DocumentEmbedding', 'AIMemory', 'AIAgentExecution', 'AITokenUsage',
  'AIProviderConfig', 'AIReference', 'Workflow'
];

let rlsSql = `\n-- -----------------------------------------------------------------------------\n-- Phase 9 RLS Policies\n-- -----------------------------------------------------------------------------\n\n`;

for (const table of directTenantTables) {
  rlsSql += `ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;\n`;
  rlsSql += `ALTER TABLE "public"."${table}" FORCE ROW LEVEL SECURITY;\n`;
  rlsSql += `CREATE POLICY "tenant_isolation_${table}" ON "public"."${table}" FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);\n\n`;
}

// WorkflowTrigger
rlsSql += `ALTER TABLE "public"."WorkflowTrigger" ENABLE ROW LEVEL SECURITY;\n`;
rlsSql += `ALTER TABLE "public"."WorkflowTrigger" FORCE ROW LEVEL SECURITY;\n`;
rlsSql += `CREATE POLICY "tenant_isolation_WorkflowTrigger" ON "public"."WorkflowTrigger" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowTrigger"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));\n\n`;

// WorkflowAction
rlsSql += `ALTER TABLE "public"."WorkflowAction" ENABLE ROW LEVEL SECURITY;\n`;
rlsSql += `ALTER TABLE "public"."WorkflowAction" FORCE ROW LEVEL SECURITY;\n`;
rlsSql += `CREATE POLICY "tenant_isolation_WorkflowAction" ON "public"."WorkflowAction" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowAction"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));\n\n`;

// WorkflowExecution
rlsSql += `ALTER TABLE "public"."WorkflowExecution" ENABLE ROW LEVEL SECURITY;\n`;
rlsSql += `ALTER TABLE "public"."WorkflowExecution" FORCE ROW LEVEL SECURITY;\n`;
rlsSql += `CREATE POLICY "tenant_isolation_WorkflowExecution" ON "public"."WorkflowExecution" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."Workflow" w WHERE w.id = "WorkflowExecution"."workflowId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));\n\n`;

// WorkflowExecutionStep
rlsSql += `ALTER TABLE "public"."WorkflowExecutionStep" ENABLE ROW LEVEL SECURITY;\n`;
rlsSql += `ALTER TABLE "public"."WorkflowExecutionStep" FORCE ROW LEVEL SECURITY;\n`;
rlsSql += `CREATE POLICY "tenant_isolation_WorkflowExecutionStep" ON "public"."WorkflowExecutionStep" FOR ALL USING (EXISTS (SELECT 1 FROM "public"."WorkflowExecution" we JOIN "public"."Workflow" w ON w.id = we."workflowId" WHERE we.id = "WorkflowExecutionStep"."executionId" AND w."tenantId" = current_setting('app.current_tenant_id', true)::text));\n\n`;


fs.appendFileSync('database/migrations/20260818000000_phase9_remediation/migration.sql', rlsSql);
console.log('RLS policies appended');
