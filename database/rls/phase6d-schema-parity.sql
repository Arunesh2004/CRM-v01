-- ==========================================
-- PHASE 6D: SCHEMA PARITY MIGRATION
-- DESIGN ONLY - DO NOT EXECUTE UNTIL APPROVED
-- ==========================================

-- 1. ADD COLUMNS (NULLABLE INITIALLY)
ALTER TABLE "WorkflowTrigger" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WorkflowExecutionStep" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DocumentPermission" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 2. BACKFILL DATA VIA PARENT RELATIONS
-- WorkflowTrigger -> Workflow
UPDATE "WorkflowTrigger" t
SET "tenantId" = w."tenantId"
FROM "Workflow" w
WHERE t."workflowId" = w.id AND t."tenantId" IS NULL;

-- WorkflowAction -> Workflow
UPDATE "WorkflowAction" a
SET "tenantId" = w."tenantId"
FROM "Workflow" w
WHERE a."workflowId" = w.id AND a."tenantId" IS NULL;

-- WorkflowExecution -> Workflow
UPDATE "WorkflowExecution" e
SET "tenantId" = w."tenantId"
FROM "Workflow" w
WHERE e."workflowId" = w.id AND e."tenantId" IS NULL;

-- WorkflowExecutionStep -> WorkflowExecution -> Workflow
UPDATE "WorkflowExecutionStep" s
SET "tenantId" = e."tenantId"
FROM "WorkflowExecution" e
WHERE s."executionId" = e.id AND s."tenantId" IS NULL;

-- DocumentPermission -> Document
UPDATE "DocumentPermission" dp
SET "tenantId" = d."tenantId"
FROM "Document" d
WHERE dp."documentId" = d.id AND dp."tenantId" IS NULL;

-- UserRole -> User
UPDATE "UserRole" ur
SET "tenantId" = u."tenantId"
FROM "User" u
WHERE ur."userId" = u.id AND ur."tenantId" IS NULL;

-- RolePermission -> Role
UPDATE "RolePermission" rp
SET "tenantId" = r."tenantId"
FROM "Role" r
WHERE rp."roleId" = r.id AND rp."tenantId" IS NULL;

-- 3. ENFORCE NOT NULL CONSTRAINTS
ALTER TABLE "WorkflowTrigger" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WorkflowAction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WorkflowExecution" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "WorkflowExecutionStep" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DocumentPermission" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UserRole" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "tenantId" SET NOT NULL;

-- 4. ADD FOREIGN KEYS
ALTER TABLE "WorkflowTrigger" ADD CONSTRAINT "WorkflowTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. CREATE MISSING TABLES
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "planId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Subscription_tenantId_idx" ON "Subscription"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
