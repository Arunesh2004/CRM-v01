-- DropIndex
DROP INDEX "WebhookEvent_eventId_key";

-- DropIndex
DROP INDEX "WebhookEvent_provider_eventId_idx";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "payload",
ADD COLUMN     "payloadHash" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Message_tenantId_idempotencyKey_key" ON "Message"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_createdAt_idx" ON "WebhookEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

