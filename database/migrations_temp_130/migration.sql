-- S14-B2: Add CallSession for internal WebRTC calling
-- Migration: 20260913000000_add_call_session
-- Created: 2026-09-13
-- Safe to apply: local/E2E only. Do NOT apply to Production.

-- CreateEnum: CallSessionStatus
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

-- CreateTable: CallSession
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

-- AddForeignKey: tenantId → Tenant
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: callerId → User (caller)
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: recipientId → User (recipient)
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex: tenant+status queries (active call lookups)
CREATE INDEX "CallSession_tenantId_status_idx" ON "CallSession"("tenantId", "status");

-- CreateIndex: caller active-call lookups
CREATE INDEX "CallSession_callerId_status_idx" ON "CallSession"("callerId", "status");

-- CreateIndex: recipient active-call lookups
CREATE INDEX "CallSession_recipientId_status_idx" ON "CallSession"("recipientId", "status");

-- AddUniqueConstraint to CallLog: allows idempotent upsert by (tenantId, providerCallId).
-- providerCallId is nullable. In PostgreSQL, NULL values are NOT equal in unique indexes,
-- so multiple rows with providerCallId = NULL are permitted. This means:
--   - External Twilio records without a SID (providerCallId = NULL): no constraint conflict.
--   - Internal WebRTC calls using CallSession.id as providerCallId: enforced unique per tenant.
--   - Twilio SIDs are CA-prefixed; internal IDs are UUIDs — no collision risk.
CREATE UNIQUE INDEX "CallLog_tenantId_providerCallId_key"
    ON "CallLog"("tenantId", "providerCallId");
