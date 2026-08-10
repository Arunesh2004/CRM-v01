# SECURITY_BYPASS_INVENTORY.md

This inventory documents all statically discovered authentication and RBAC vulnerabilities within the repository.

## 1. Authentication Bypass Paths
**Status: CLEAR**
A static code review of API handlers and middleware confirms that `tenantId` is consistently acquired through trusted backend context (e.g. `auth.ts -> getCurrentTenant()`), effectively ignoring untrusted payload values for `tenantId`.

## 2. User & Role Modification
**Status: SECURE BUT MISSING APIS**
No direct bypasses exist for `prisma.userRole.create` or `prisma.role.update` outside of the initial Clerk provisioning webhooks (`src/modules/auth/services/provisioning.service.ts`). The provisioning service correctly infers `tenantId` from metadata and establishes secure associations.

There are currently **NO APIS** for:
- Role reassignment (e.g., escalating from MEMBER to TENANT_ADMIN)
- Permission modification (e.g., granting CUSTOMER:DELETE)
- Manual user invitation

Therefore, no explicit API boundaries can be bypassed since the operations are natively impossible via the current HTTP surface area.

## 3. Potential Database Bypass (Missing Service Guards)
If new endpoints are introduced calling `prisma.userRole.create`, they **MUST** implement:
- `requirePermission('SYSTEM', 'UPDATE')` (or `USER:UPDATE`)
- `assertUserTenant()` to ensure cross-tenant role mapping is blocked

**Conclusion:** The application relies on `auth.ts` and `tenant-guard.ts`. While the application logic is secure today, developers must proactively apply the newly introduced guard functions on all future mutation routes.
