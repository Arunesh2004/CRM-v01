# Phase 15B — Production Auth Diagnostic Fix Report

## 1. Cause of BigInt Serialization Errors
The diagnostic queries returning `COUNT(*)` were retrieving values from PostgreSQL using raw SQL (via Prisma's `$queryRaw`). Prisma returns PostgreSQL `COUNT` values as JavaScript `BigInt` objects. The logging library (`Logger`) and underlying `JSON.stringify` natively fail to serialize `BigInt` values, resulting in the "Do not know how to serialize a BigInt" error.

## 2. Cause of 25P02
The `25P02` (current transaction is aborted, commands ignored until end of transaction block) error occurred because a previous query inside the same PostgreSQL transaction failed. When any query inside a PostgreSQL transaction raises an error, PostgreSQL automatically marks the entire transaction block as aborted, causing all subsequent queries on that connection/transaction to fail with `25P02` until a `ROLLBACK` is issued.

## 3. Which Diagnostic Query Caused the Abort
The transaction was aborted by the following diagnostic query:
```sql
SELECT count(*) as count FROM _prisma_migrations
```
This failed with PostgreSQL error `42P01` (relation "_prisma_migrations" does not exist). Because this query was executed within the `$transaction` block of `executeAsSystem`, the entire authentication transaction was poisoned. As a result, the critical actual lookup `tx.user.findFirst` later in the block failed with `25P02 PrismaClientUnknownRequestError`, which propagated to `getCurrentUser()` and `CRMLayout`.

## 4. How the Diagnostic Was Fixed/Isolated
To prevent diagnostic queries from poisoning the actual authentication logic, the minimal necessary changes were made:
- All BigInt `COUNT(*)` results are now explicitly cast and accessed via `Number(result[0].count)` before being logged. This prevents serialization errors.
- The `_prisma_migrations` query was **completely removed** to prevent it from aborting the transaction, as it isn't strictly necessary to prove database connectivity and is the direct cause of the transaction abort.
- All other read-only metadata lookups (e.g., `current_database()`, `current_user`, `cluster_name`, `COUNT(*)`) are retained and wrapped in their own `try/catch` blocks. However, because they are valid syntax/relations, they are highly unlikely to throw `42P01` and abort the transaction. 

## 5. Confirmation of Unchanged Behavior
No authentication, database, RLS, or Clerk behavior was intentionally changed. The production authentication transaction and `executeAsSystem` semantics remain exactly the same as before the diagnostic instrumentation was introduced. The instrumentation itself remains strictly read-only and observational. 

## 6. TSC Result
The TypeScript compiler (`npx tsc --noEmit`) completed successfully.

## 7. ESLint Result
The linter (`npx eslint src/lib/auth.ts`) completed successfully.

---
**Note:** The root cause of the initial database mismatch discrepancy (where `clerkId` lookup returned `[]`) remains unproven and will be investigated using the fresh logs produced by this corrected instrumentation.
