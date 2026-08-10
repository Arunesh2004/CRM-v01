# PHASE 6.0 CASCADE DECISION MATRIX

## Objective
Classify every foreign key relationship on the `Tenant` model to explicitly determine its behavior during a Soft Delete migration. We must deliberately sever `Cascade` paths where data must survive for compliance.

## Matrix

| Relation | Action | Justification |
|---|---|---|
| `User` | **REMOVE CASCADE** | Must persist `INACTIVE` state. Bound to historical audit logs. |
| `Role` / `Permission` | **REMOVE CASCADE** | Restored tenants require their RBAC matrix fully intact. |
| `DeviceSession` | **KEEP CASCADE** | Active sessions are ephemeral. Wiping them forces hard logout. |
| `AuditLog` | **RESTRICT** | Logs must mathematically never be deleted. |
| `TenantIntegration` | **REMOVE CASCADE** | API keys persist in an encrypted state to allow instant reconnection upon recovery. |
| `Customer`, `Lead`, `Task`, `Location` | **REMOVE CASCADE** | Core CRM data requires soft deletion, not DB-level wipe. |
| `Call`, `Message`, `Conversation` | **REMOVE CASCADE** | Communications are legal e-discovery records. |
| `Incident`, `Camera`, `AI Event` | **REMOVE CASCADE** | Security logs must persist for historical analysis. |
| `Subscription`, `Invoice` | **REMOVE CASCADE** | Financial records must remain for tax compliance. |
| `Notification` | **KEEP CASCADE** | UI notifications for a deleted tenant are irrelevant. |

## Execution
In `schema.prisma`, any relation marked **REMOVE CASCADE** will have its `onDelete: Cascade` declaration explicitly deleted, defaulting to PostgreSQL's standard behavior (which preserves the child row, provided the parent `Tenant` is not hard-deleted, which it won't be since we are soft-deleting it).
