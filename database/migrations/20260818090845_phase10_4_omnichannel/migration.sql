-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- AlterEnum
ALTER TYPE "Resource" ADD VALUE 'TICKET';

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "ActorType" NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "responseMinutes" INTEGER NOT NULL DEFAULT 60,
    "resolutionTimeMinutes" INTEGER NOT NULL DEFAULT 1440,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLAConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLAEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLAEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_tenantId_status_idx" ON "Ticket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_assignedUserId_status_idx" ON "Ticket"("tenantId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_slaDeadline_idx" ON "Ticket"("tenantId", "slaDeadline");

-- CreateIndex
CREATE INDEX "TicketMessage_tenantId_ticketId_createdAt_idx" ON "TicketMessage"("tenantId", "ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SLAConfiguration_tenantId_priority_key" ON "SLAConfiguration"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "SLAEvent_tenantId_ticketId_idx" ON "SLAEvent"("tenantId", "ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "SLAEvent_tenantId_ticketId_type_key" ON "SLAEvent"("tenantId", "ticketId", "type");

-- CreateIndex
CREATE INDEX "ApprovalStep_tenantId_status_idx" ON "ApprovalStep"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAConfiguration" ADD CONSTRAINT "SLAConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAEvent" ADD CONSTRAINT "SLAEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLAEvent" ADD CONSTRAINT "SLAEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_Ticket" ON "Ticket" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "TicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_TicketMessage" ON "TicketMessage" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "SLAConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfiguration" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_SLAConfiguration" ON "SLAConfiguration" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "SLAEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_SLAEvent" ON "SLAEvent" AS PERMISSIVE FOR ALL TO public USING ("tenantId" = current_setting('app.current_tenant_id', true));
