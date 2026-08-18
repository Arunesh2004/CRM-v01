-- AlterEnum
ALTER TYPE "Action" ADD VALUE 'MANAGE_TERRITORIES';

-- AlterEnum
ALTER TYPE "Resource" ADD VALUE 'SALES_INTEL';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "probabilityFactors" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "score" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "scoreFactors" JSONB;

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTerritory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTerritory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuota" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DOUBLE PRECISION NOT NULL,
    "probability" INTEGER,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Territory_tenantId_idx" ON "Territory"("tenantId");

-- CreateIndex
CREATE INDEX "Territory_tenantId_parentId_idx" ON "Territory"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "UserTerritory_tenantId_userId_idx" ON "UserTerritory"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserTerritory_tenantId_territoryId_idx" ON "UserTerritory"("tenantId", "territoryId");

-- CreateIndex
CREATE INDEX "SalesQuota_tenantId_userId_idx" ON "SalesQuota"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SalesQuota_tenantId_period_idx" ON "SalesQuota"("tenantId", "period");

-- CreateIndex
CREATE INDEX "DealSnapshot_tenantId_dealId_date_idx" ON "DealSnapshot"("tenantId", "dealId", "date");

-- CreateIndex
CREATE INDEX "DealSnapshot_tenantId_date_idx" ON "DealSnapshot"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTerritory" ADD CONSTRAINT "UserTerritory_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuota" ADD CONSTRAINT "SalesQuota_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuota" ADD CONSTRAINT "SalesQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================================================
-- PHASE 10.2: RLS ENFORCEMENT
-- ==================================================

-- Territory
ALTER TABLE "Territory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_territory" ON "Territory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- UserTerritory
ALTER TABLE "UserTerritory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTerritory" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_user_territory" ON "UserTerritory"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- SalesQuota
ALTER TABLE "SalesQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesQuota" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_sales_quota" ON "SalesQuota"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);

-- DealSnapshot
ALTER TABLE "DealSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealSnapshot" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_deal_snapshot" ON "DealSnapshot"
    AS PERMISSIVE FOR ALL
    TO public
    USING ("tenantId" = current_setting('app.current_tenant_id', true)::text);
