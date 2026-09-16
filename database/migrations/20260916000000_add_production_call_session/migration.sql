-- Phase 15B: Production CallSession DDL with strict RLS
-- Migration: 20260916000000_add_production_call_session
-- Created: 2026-09-16
-- Applies: CallSession table, enum, FKs, CallLog index, and RLS

BEGIN;

-- 1. CreateEnum: CallSessionStatus
CREATE TYPE "CallSessionStatus" AS ENUM (
  'RINGING',
  'ACCEPTED',
  'CONNECTED',
  'REJECTED',
  'MISSED',
  'ENDED',
  'FAILED',
  'EXPIRED'
);

-- 2. CreateTable: CallSession
CREATE TABLE "CallSession" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "callerId"      TEXT NOT NULL,
    "recipientId"   TEXT NOT NULL,
    "status"        "CallSessionStatus" NOT NULL DEFAULT 'RINGING',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "expiresAt"     TIMESTAMP(3) NOT NULL,
    "acceptedAt"    TIMESTAMP(3),
    "connectedAt"   TIMESTAMP(3),
    "endedAt"       TIMESTAMP(3),
    "failureReason" TEXT,
    "version"       INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- 3. AddForeignKey: tenantId → Tenant
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. AddForeignKey: callerId → User (caller)
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. AddForeignKey: recipientId → User (recipient)
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. CreateIndex: tenant+status queries
CREATE INDEX "CallSession_tenantId_status_idx" ON "CallSession"("tenantId", "status");

-- 7. CreateIndex: caller active-call lookups
CREATE INDEX "CallSession_callerId_status_idx" ON "CallSession"("callerId", "status");

-- 8. CreateIndex: recipient active-call lookups
CREATE INDEX "CallSession_recipientId_status_idx" ON "CallSession"("recipientId", "status");

-- 9. AddUniqueConstraint to CallLog for Idempotent Sync
-- Missing in production, but strictly required by Phase 15B WebRTC upsert logic.
CREATE UNIQUE INDEX "CallLog_tenantId_providerCallId_key"
    ON "CallLog"("tenantId", "providerCallId");

-- 10. ENABLE STRICT TENANT ISOLATION (RLS)
ALTER TABLE "CallSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallSession" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_CallSession" ON "CallSession"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

COMMIT;
