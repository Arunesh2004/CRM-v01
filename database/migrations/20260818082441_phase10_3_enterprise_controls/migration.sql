-- CreateTable
CREATE TABLE "FieldSecurityPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "securityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldSecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABACPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "effect" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ABACPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "workflowStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "approverId" TEXT,
    "approverRoleId" TEXT,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldSecurityPolicy_tenantId_modelName_fieldName_key" ON "FieldSecurityPolicy"("tenantId", "modelName", "fieldName");

-- CreateIndex
CREATE INDEX "ABACPolicy_tenantId_resource_action_idx" ON "ABACPolicy"("tenantId", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_workflowStepId_key" ON "ApprovalRequest"("workflowStepId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_status_idx" ON "ApprovalRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_tenantId_approvalRequestId_idx" ON "ApprovalStep"("tenantId", "approvalRequestId");

-- AddForeignKey
ALTER TABLE "FieldSecurityPolicy" ADD CONSTRAINT "FieldSecurityPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABACPolicy" ADD CONSTRAINT "ABACPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS Injections

ALTER TABLE "FieldSecurityPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSecurityPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_FieldSecurityPolicy" ON "FieldSecurityPolicy" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ABACPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ABACPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ABACPolicy" ON "ABACPolicy" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ApprovalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ApprovalRequest" ON "ApprovalRequest" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ApprovalStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalStep" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_ApprovalStep" ON "ApprovalStep" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));
