# AUTHENTICATION & SESSION IMPACT (TENANT STATUS MATRIX)

## Tenant State Matrix Validation
This table projects the expected security behaviors once the `TenantStatus` soft-delete architecture is implemented.

| Tenant Status | Login via Clerk | Next.js API Access (`requireTenant`) | Background Jobs (Cron) | Inbound Webhooks |
|---|---|---|---|---|
| **ACTIVE** | Allowed | Allowed | Processed | Accepted |
| **SUSPENDED** | Allowed | **Blocked (403)** | Skipped | **Accepted** (Queue/Buffer) |
| **DELETION_REQUESTED** | Allowed | **Blocked (403)** | Skipped | Ignored (Dropped) |
| **DELETED** | **Blocked (Clerk Ban)**| **Blocked (403)** | Skipped | Ignored (HTTP 200 Ack) |

## Required Changes
1. **Next.js Middleware (`auth.ts`):** `requireTenant()` must actively query the `Tenant` status upon every request. If status is `SUSPENDED` or `DELETED`, it must throw a hard `403 Forbidden`. Currently, it only checks if the tenant exists.
2. **Clerk Integration:** A backend job must actively Ban or Delete users in the Clerk dashboard once the Tenant transitions to the final `DELETED` state.
