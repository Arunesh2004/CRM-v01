# PHASE R.1.4 — Employee Account Verification

## Objective
Audit the Employee lifecycle and strict Role-Based Access Control (RBAC) boundaries within a shared tenant workspace.

## Employee Lifecycle Flow
1. **Creation/Invite**: ✅ Working. Handled via tenant invites or automatic join logic matching email domains to `tenantId`.
2. **Access Rights**: ✅ Working. The standard user is provisioned with a `MEMBER` role, not `TENANT_ADMIN`.
3. **Module Loading**: ✅ Working. Next.js App Router boundaries verify role scopes on the server before rendering highly privileged UI components (like billing dashboards).

## RBAC Verification Matrix
*Simulated Profile: Sales Employee ("MEMBER" role)*

### Allowed Actions (✅ CAN DO)
- Login to the unified SaaS platform.
- Read and mutate assigned leads (`prisma.lead.findMany`).
- View general customer directories constrained by `tenantId`.
- Access and update Tasks.

### Blocked Actions (❌ CANNOT DO)
- Cannot access Billing modules. `requirePermission(Resource.BILLING, Action.READ)` structurally rejects requests where the user's role lacks this explicit mapping.
- Cannot mutate Tenant Settings or delete the workspace. (Guarded by `TENANT_ADMIN` explicit overrides and `ownerId` strict mapping).
- Cannot read/write outside their `tenantId` (Guarded universally by Prisma `where` clause injections).

**Conclusion**: RBAC behaves precisely as expected. The combination of Prisma schema enums (`Resource`, `Action`) heavily guards the business domain. The middleware ensures unauthenticated attacks bounce, while internal functions (`checkPermission`) ensure authenticated users cannot escalate privileges.
