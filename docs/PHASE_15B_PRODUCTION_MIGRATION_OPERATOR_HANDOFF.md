# PHASE 15B PRODUCTION MIGRATION OPERATOR HANDOFF

This document provides the exact verified steps to apply the `CallSession` database schema updates to production.

> [!IMPORTANT]  
> **Status Checklist**  
> - [x] 1. Production preflight verified
> - [x] 2. Migration isolated execution verified
> - [ ] 3. Human production application pending
> - [ ] 4. Migration history reconciliation pending
> - [ ] 5. Application deployment pending
> - [ ] 6. Authenticated two-browser E2E pending

> [!WARNING]  
> **DO NOT USE `npx prisma migrate deploy`**  
> The migration `20260913000000_add_call_session` remains local/E2E-only. Running `deploy` will attempt to apply it and break the strict tenant isolation requirements. You MUST apply this additive SQL manually and then resolve it.

## 1. Exact Migration Name
`20260916000000_add_production_call_session`

## 2. Preflight Checks
Run these READ-ONLY queries in the production Supabase SQL Editor. 
**ALL OF THEM MUST RETURN 0 ROWS.**

```sql
-- 1. Check Enum
SELECT 1 FROM pg_type WHERE typname = 'CallSessionStatus';

-- 2. Check Table and RLS
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class WHERE relname = 'CallSession';

-- 3. Check Policy
SELECT polname FROM pg_policies 
WHERE tablename = 'CallSession' AND polname = 'tenant_isolation_CallSession';

-- 4. Check CallLog Unique Index (CRITICAL)
SELECT indexname, indexdef FROM pg_indexes 
WHERE indexname = 'CallLog_tenantId_providerCallId_key';

-- 5. Verify no cross-tenant collisions in existing CallLog data
SELECT "providerCallId", COUNT(DISTINCT "tenantId") AS tenant_count 
FROM public."CallLog" 
WHERE "providerCallId" IS NOT NULL 
GROUP BY "providerCallId" 
HAVING COUNT(DISTINCT "tenantId") > 1;
```

## 3. Exact Human-Executed Production SQL
Run the following exact DDL manually in the production Supabase SQL Editor:

```sql
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
CREATE UNIQUE INDEX "CallLog_tenantId_providerCallId_key"
    ON "CallLog"("tenantId", "providerCallId");

-- 10. ENABLE STRICT TENANT ISOLATION (RLS)
ALTER TABLE "CallSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallSession" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_CallSession" ON "CallSession"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

COMMIT;
```

## 4. Post-DDL Verification Queries
Run these to verify the schema was successfully applied:

```sql
-- Should return 1 row with ENABLED row security
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class WHERE relname = 'CallSession';

-- Should return the policy
SELECT polname FROM pg_policies 
WHERE tablename = 'CallSession' AND polname = 'tenant_isolation_CallSession';

-- Should return the CallLog index
SELECT indexname FROM pg_indexes 
WHERE indexname = 'CallLog_tenantId_providerCallId_key';
```

## 5. Exact Prisma Migrate Resolve Command
Once the DDL is applied and verified, you MUST inform Prisma that it was applied so it doesn't try to apply it again:

```bash
npx prisma migrate resolve --applied 20260916000000_add_production_call_session
```

## 6. Verification of Migration History
Run this SQL to verify the exact state of Prisma's history table:

```sql
SELECT migration_name, finished_at, rolled_back_at 
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260913000000_add_call_session',
  '20260914000000_rls_defect_remediation',
  '20260915154154_add_communication_references',
  '20260916000000_add_production_call_session'
)
ORDER BY started_at ASC;
```

**EXPECTED RESULT:**
- `20260913000000_add_call_session` MUST NOT BE LISTED OR NO `finished_at`.
- `20260914000000_rls_defect_remediation` MUST have a `finished_at`.
- `20260915154154_add_communication_references` MUST have a `finished_at`.
- `20260916000000_add_production_call_session` MUST have a `finished_at`.

## 7. Rollback/Recovery Procedure
This is an entirely additive migration. If the application deployment fails or a rollback is required, the new table/enum will simply sit idle. **Do NOT run a DROP TABLE on production unless absolutely necessary and coordinated with the DBA team.** 

If you must revert the DDL manually:
```sql
BEGIN;
DROP INDEX IF EXISTS "CallLog_tenantId_providerCallId_key";
DROP TABLE IF EXISTS "CallSession" CASCADE;
DROP TYPE IF EXISTS "CallSessionStatus" CASCADE;
COMMIT;
```
Then run:
```bash
npx prisma migrate resolve --rolled-back 20260916000000_add_production_call_session
```
