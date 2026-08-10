# TENANT LIFECYCLE AUDIT & SOFT DELETE ARCHITECTURE

## 1. Current Tenant Lifecycle Evaluation
The current platform natively supports `ACTIVE` and `PENDING` states (found in `TenantStatus` enum).
- **Suspension Support:** `SUSPENDED` is present in the database enum, but there is no API logic or middleware enforcing lockout when `status === 'SUSPENDED'`. **Result: NOT IMPLEMENTED**.
- **Tenant Deletion:** The current database uses a permanent **Hard Delete** model via Prisma `onDelete: Cascade`.

### What happens during current deletion?
If `prisma.tenant.delete({ where: { id: tenantId } })` is executed:
- `User`, `Role`, `Permission`, `Customer`, `Lead`, `Task`, `Message`, `Incident`, and `Call` records are instantly and permanently erased.
- `AuditLog` utilizes `onDelete: Restrict`, meaning attempting to delete the Tenant will actually throw a Foreign Key Constraint violation unless the logs are manually deleted first. If bypassed, the audit history is lost.
- **Accidental Deletion Reversible?** 🔴 NOT SUPPORTED.

## 2. Proposed Soft Delete Architecture (Do Not Implement)
To resolve the irrecoverable deletion risk, Phase 6 must transition the `Tenant` model to a soft-delete lifecycle.

### Schema Changes (Design Only):
```prisma
model Tenant {
  // Existing fields...
  status         TenantStatus @default(PENDING) // ACTIVE | SUSPENDED | DELETION_REQUESTED | DELETED
  deletedAt      DateTime?
  deletedById    String?
  deletionReason String?
}
```

### Impact Analysis
- **Prisma Relations:** Replacing Hard Deletes allows `Tenant` rows to persist.
- **Cascade Rules:** We would remove `onDelete: Cascade` from top-level models, preserving all relational data gracefully.
- **Audit History:** `AuditLog` would remain fully intact, maintaining forensic compliance indefinitely.
- **Authentication:** Next.js Middleware and `requireTenant()` must be updated to throw `403 Forbidden - Tenant Suspended` if `status !== 'ACTIVE'`, instantly severing API access for all descendant users without deleting their cryptographic identities.

## CONCLUSION
The current Hard Delete cascade is highly dangerous for a multi-tenant SaaS. Accidental deletion is an unrecoverable disaster. Implementing the proposed Soft Delete Architecture is a strict requirement for Phase 6.
