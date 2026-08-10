# PHASE 6.0.1 PRISMA SOFT DELETE SECURITY REPORT

## Architecture Review
The Phase 6.0 soft-delete implementation relied on an insecure mechanism: the Prisma Client Extension dynamically checked for an `includeDeleted: true` flag in the `where` clause to bypass the global `deletedAt: null` filter.

### Risk Identified
**Vulnerability:** Parameter Injection / Filter Bypass. 
If an API route blindly passes `req.body` into a Prisma `where` clause (e.g., `prisma.user.findMany({ where: req.body })`), a malicious actor could include `"includeDeleted": true` in their JSON payload. This would cause the Prisma Extension to strip the soft-delete filter, leaking purged records to unauthorized clients.

### Remediation Implemented
The `database/utils/prisma.ts` architecture has been completely redesigned into a Dual-Client model.

1. **`prisma` (Default Client):**
   - Strictly enforces the global `deletedAt: null` filter on all read operations (`findMany`, `findFirst`, `findUnique`, `count`, `aggregate`).
   - The `includeDeleted` override has been entirely removed from the extension logic. It is mathematically impossible for an API route using the default `prisma` client to fetch a soft-deleted record.

2. **`prismaAdmin` (Recovery Client):**
   - A raw, unextended `PrismaClient` exported alongside the default client.
   - It applies zero filters.
   - This client is strictly reserved for internal background jobs (e.g., the billing engine verifying outstanding invoices before hard deletion) and the future Tenant Restore CLI.

## Conclusion
The Prisma Soft Delete architecture is now insulated from parameter injection attacks. Standard operational queries are permanently filtered, while administrative modules retain explicit, isolated access to purged data.

**Result: PASS**
