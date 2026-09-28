# WEBRTC CALLSESSION MIGRATION VERIFICATION GATE

## 1. Current Prerequisite Status
- **Pusher Configuration**: MISSING / UNKNOWN (Pending manual verification in Vercel)
- **Second Identity**: BLOCKED (Pending manual provisioning via Employee Invite workflow)
- **CallSession Migration**: UNVALIDATED

## 2. Existing Verification Mechanisms Found
An investigation was conducted into the repository's current diagnostic tools.
- `/api/diagnostic/route.ts` exists and is secured by `GLOBAL_ADMIN` role. However, it only checks `User` and `Tenant` basic existence, `build-db.json`, and environment variables. It does NOT query `CallSession` or `_prisma_migrations`.
- The `scripts/` folder contains local verification scripts (e.g., `verify_phase4_communications_sec.ts`) which use the local Prisma client but cannot run against production without mutating credentials or deployment.
- **Conclusion**: There is NO existing safe, approved read-only mechanism to verify the `CallSession` schema and migration bookkeeping in the production database.

## 3. Expected CallSession Production Schema
Based on `database/migrations/20260916000000_add_production_call_session/migration.sql` and `database/schema.prisma`:
- **Table**: `CallSession`
- **Columns**: `id` (PK), `tenantId`, `callerId`, `recipientId`, `status` (Enum), `createdAt`, `updatedAt`, `expiresAt`, `acceptedAt`, `connectedAt`, `endedAt`, `failureReason`, `version`.
- **Foreign Keys**: `tenantId` → `Tenant`, `callerId` → `User`, `recipientId` → `User`
- **Indexes**: 
  - `CallSession_tenantId_status_idx`
  - `CallSession_callerId_status_idx`
  - `CallSession_recipientId_status_idx`
  - `CallLog_tenantId_providerCallId_key`
- **Security (RLS)**:
  - `ENABLE ROW LEVEL SECURITY`
  - `FORCE ROW LEVEL SECURITY`
  - Policy: `tenant_isolation_CallSession` using `app.current_tenant_id`

## 4. Schema Verification Requirements
To prove schema existence, we must verify:
- `CallSession` table exists.
- `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` are active (`relrowsecurity`, `relforcerowsecurity` in `pg_class`).
- Strict RLS policy exists.

## 5. Migration Bookkeeping Verification Requirements
To prove migration bookkeeping is accurate, we must verify:
- A record exists in the `_prisma_migrations` table for `20260916000000_add_production_call_session` where `finished_at` is NOT NULL and `rolled_back_at` is NULL.

## 6. Safe Verification Mechanism Available/Not Available
**NOT AVAILABLE**. A new mechanism must be proposed and authorized.

## 7. Security Considerations
Any mechanism must ensure:
- No exposure of production PII or tenant business data.
- Strict authentication (GLOBAL_ADMIN only).
- Read-only execution (SELECTs only).
- Safe tear-down or continued restricted access.

## 8. Minimal Proposed Read-Only Mechanism
Because no mechanism exists, I propose creating a temporary, restricted diagnostic endpoint (e.g., `/api/diagnostic/migration-check` or extending `/api/diagnostic`).
- **Exact information that must be read**: 
  1. `pg_class` metadata for table existence and RLS flags (`relrowsecurity`, `relforcerowsecurity`).
  2. `_prisma_migrations` table for the migration timestamp.
- **Why it is needed**: To definitively prove the migration applied successfully in production without risking false failures during WebRTC E2E tests.
- **Minimum read-only query/metadata required**:
  - `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'CallSession';`
  - `SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name LIKE '%add_production_call_session%';`
- **Where it would execute**: A Next.js API route (`/api/diagnostic/migration-check`).
- **How access would be authenticated**: By wrapping the route with the existing `requireAuth()` and enforcing the `GLOBAL_ADMIN` role constraint.
- **How tenant/security boundaries remain protected**: The SQL explicitly targets internal Postgres catalog tables (`pg_class`) and Prisma bookkeeping (`_prisma_migrations`). It does not query any tenant data rows.
- **How secret/data exposure is prevented**: The endpoint will only return a boolean `applied: true/false` and `rls_enabled: true/false`, not database secrets or row contents.
- **Why the mechanism cannot mutate production**: Using Prisma's `$queryRawUnsafe` strictly for `SELECT` statements, which are read-only.
- **How it would be removed or kept safely afterward**: We can revert the commit containing the endpoint after verification, or leave it as a permanent `GLOBAL_ADMIN`-only health check.

## 9. Exact Authorization Required Before Implementation
I require explicit authorization to:
1. Implement the proposed `/api/diagnostic/migration-check` endpoint (or extend the existing one).
2. Commit and push the code so it deploys to Vercel.

## 10. Current E2E Blockers
1. Manual Vercel environment variable configuration for Pusher.
2. Manual provisioning of the second CRM identity via the employee invite workflow.
3. Authorization and implementation of the read-only CallSession migration verification endpoint.
4. Successful validation of the CallSession production migration using the new mechanism.
