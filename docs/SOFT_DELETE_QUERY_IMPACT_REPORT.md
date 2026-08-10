# QUERY BEHAVIOR AUDIT (SOFT DELETE IMPACT)

## The Soft Delete Problem
Transitioning to Soft Deletes introduces a severe risk: existing `findMany`, `findFirst`, and `count` queries will natively return deleted records unless explicitly filtered.

### Models Requiring Automatic Filtering (`deletedAt: null`)
1. **Users:** The user dropdowns and assignment selectors must exclude soft-deleted users.
2. **Customers, Leads, Tasks, Locations, Incidents:** Currently, all service functions in `src/modules/crm` explicitly append `deletedAt: null` in their `where` clauses. This is already implemented correctly.
3. **Messages, Calls:** If we introduce soft deletes to communications, the frontend UI queries must be updated to append `deletedAt: null`. Currently, they fetch all records because they assume database hard deletes.

## Recommendation
Prisma currently lacks a global `defaultScope` (unlike Laravel or Rails). 
**Required Change:** We must build Prisma Client Extensions (Middleware) in `src/lib/db.ts` to automatically inject `deletedAt: null` into all `findMany` and `findFirst` queries across all soft-deletable models. Relying on developers to manually type `deletedAt: null` every time is a guaranteed security vulnerability.
