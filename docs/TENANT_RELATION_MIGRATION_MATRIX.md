# TENANT RELATION MIGRATION MATRIX

## Objective
Analyze the impact of transitioning the `Tenant` model from `onDelete: Cascade` to a Soft Delete architecture. For every tenant relationship, we must classify the required migration path to ensure data integrity, forensic preservation, and seamless recoverability.

## Migration Classifications

| Relationship | Current State | Target State | Justification |
|---|---|---|---|
| **Users** | `Cascade` | **SOFT DELETE REQUIRED** | Users must be deactivated, not destroyed. Their historical linkage to audit logs must be preserved permanently. |
| **Roles & Permissions** | `Cascade` | **SOFT DELETE REQUIRED** | If a tenant is restored, their custom RBAC matrices must be recovered exactly as they were left. |
| **Customers, Leads, Tasks** | `Cascade` (w/ `deletedAt`) | **REMOVE CASCADE** | These entities already support `deletedAt`. We must remove the Prisma-level cascade on `Tenant` so they aren't physically wiped. |
| **Messages & Conversations** | `Cascade` | **SOFT DELETE REQUIRED** | Communications are legal records. They must persist in a soft-deleted state for compliance and e-discovery. |
| **Calls & Recordings** | `Cascade` | **SOFT DELETE REQUIRED** | Media assets and telephony metadata must be retained for compliance, pending manual administrative purging. |
| **Incidents & Cameras** | `Cascade` | **SOFT DELETE REQUIRED** | Security logs and AI events must not be wiped instantly, ensuring historical security audits remain intact. |
| **Audit Logs** | `Restrict` | **KEEP RESTRICT** | The `Restrict` constraint mathematically guarantees that no user can delete an audit log even if the parent tenant is deleted. |
| **Billing (Subscriptions/Invoices)** | `Cascade` | **SOFT DELETE REQUIRED** | Financial history must be preserved for tax and accounting compliance regardless of the tenant's status. |
| **TenantIntegrations** | `Cascade` | **SOFT DELETE REQUIRED** | Preserving encrypted tokens allows a restored tenant to instantly resume external API access without re-authenticating. |

## Execution Plan
To implement this, Phase 6 must:
1. Strip `onDelete: Cascade` from the `Tenant` relation across all core business models.
2. Introduce a `deletedAt DateTime?` column to all models that lack it (e.g., `User`, `Role`, `Message`).
3. Build a global application-level cascading soft-delete function that traverses the relational tree and updates `deletedAt` without issuing physical `DELETE` statements.
