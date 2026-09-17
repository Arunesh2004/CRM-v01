# Phase 15B — Production Database User Lookup Forensic Report

## 1. Runtime Database Identity
- **Environment URLs**: `[PENDING]` (Diagnostic to check `DATABASE_URL` vs `ADMIN_DATABASE_URL` hostnames)
- **Database Name**: `[PENDING]`
- **Database User**: `[PENDING]`
- **Server Address**: `[PENDING]`
- **PostgreSQL Version**: `[PENDING]`

## 2. Schema and Search Path
- **Current Schema**: `[PENDING]`
- **Search Path**: `[PENDING]`

## 3. Runtime Database Role
- `executeAsSystem` connects using the `ADMIN_DATABASE_URL` connection string.
- Whether this differs from the main `DATABASE_URL` is pending runtime validation.

## 4. Prisma User Lookup (by clerkId)
- **Result**: `NOT_FOUND` (From previous runtime evidence)

## 5. Raw SQL User Lookup (by clerkId)
- **Result**: `[PENDING]`

## 6. User Lookup (by email)
- **Raw SQL Result**: `[PENDING]`
- **Prisma Result**: `[PENDING]`

## 7. RLS Enabled/Forced Status
- **Row Security**: `[PENDING]`
- **Force Row Security**: `[PENDING]`

## 8. Relevant RLS Policies
- `[PENDING]`

## 9. executeAsSystem Behavior
- `executeAsSystem` bypasses the standard request tenant/RLS context by instantiating a separate `PrismaClient` connected to `ADMIN_DATABASE_URL`.
- It executes within a `$transaction` timeout envelope (maxWait 25s, timeout 25s).
- It performs system-level administrative queries without `rls.set_tenant_id` context.

## 10. Tenant/RLS Context
- `getCurrentUser` executes **before** tenant context is established.
- It uses `executeAsSystem` specifically because RLS policies normally block reads without tenant context.

## 11. Provisioning Fallback Trace
- **Result**: `NOT_FOUND`
- The fallback logic first looks up the user by email locally. If found, it evaluates whether to bind, match, or reject the Clerk ID. If the local email query also returns `NOT_FOUND`, it denies the login.
- Current evidence suggests the application cannot see the User row by `clerkId`. The new diagnostics will reveal if it can see it by `email`.

## 12. Comparison with Operator-Verified Supabase User
- **Operator SQL Identity**: `dcc1344c-4398-4611-b5fd-6775c0f9adea`
- **Application SQL Identity**: `[PENDING]`
- Will verify if the application is connecting to the identical physical database.

## 13. Exact Discrepancy
- The `clerkId` exists in production but is invisible to `tx.user.findFirst`.
- Suspicion: `ADMIN_DATABASE_URL` in the Vercel Production environment might be pointing to a Staging DB, an outdated branch DB, or a different Supabase project entirely compared to what the operator queried.

## 14. Proven Root Cause
**ROOT CAUSE NOT YET PROVEN**
*(Pending live execution of diagnostic queries)*

## 15. Security Assessment
- Diagnostics strictly avoid exposing full connection strings, credentials, JWTs, or PII. Only metadata and booleans are logged.

## 16. Exact Minimal Fix Recommendation
*(Pending)*

## 17. Validation Plan
1. Deploy this diagnostic instrumentation.
2. Sign in manually with the Production Demo Admin account on `crm-v01.vercel.app`.
3. Reproduce the `/unauthorized` redirect exactly once.
4. Extract the newly added `[AUTH_DIAGNOSTIC]` sequences from the Vercel logs to definitively pinpoint the DB mismatch or RLS failure.
