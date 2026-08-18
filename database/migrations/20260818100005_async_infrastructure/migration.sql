-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterQueue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "lastError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_key_key" ON "IdempotencyKey"("tenantId", "key");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_tenantId_status_idx" ON "DeadLetterQueue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_createdAt_idx" ON "DeadLetterQueue"("createdAt");

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadLetterQueue" ADD CONSTRAINT "DeadLetterQueue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" ENABLE ROW LEVEL SECURITY;

-- Force RLS
ALTER TABLE "IdempotencyKey" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DeadLetterQueue" FORCE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "tenant_isolation_idempotency_key" ON "IdempotencyKey"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "tenant_isolation_dlq" ON "DeadLetterQueue"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

