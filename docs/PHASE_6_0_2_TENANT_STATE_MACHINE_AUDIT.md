# PHASE 6.0.2 TENANT STATE MACHINE AUDIT

## State Machine Overview
Current states: `ACTIVE`, `SUSPENDED`, `DELETION_REQUESTED`, `DELETED`.
Proposed enterprise states: `ACTIVE`, `SUSPENDED`, `DELETION_REQUESTED`, `ARCHIVED`, `PURGED`.

## Allowed Transitions
- `ACTIVE` -> `SUSPENDED` (Triggered by billing failure / admin)
- `SUSPENDED` -> `ACTIVE` (Triggered by payment success / admin)
- `ACTIVE` | `SUSPENDED` -> `DELETION_REQUESTED` (Triggered by Owner)
- `DELETION_REQUESTED` -> `ACTIVE` (Triggered by Owner cancellation of deletion)
- `DELETION_REQUESTED` -> `ARCHIVED` (Triggered by system cron after 30 days)
- `ARCHIVED` -> `PURGED` (Triggered by system cron after 7 years legal retention)

## Forbidden Transitions
- `PURGED` -> `ACTIVE`: **BLOCKED**. A purged tenant has had all PII irrevocably scrambled/anonymized. It cannot be mathematically reconstructed.
- `DELETED` -> `ACTIVE`: **BLOCKED**. In the previous architecture, DELETED meant physically removed.
- `ARCHIVED` -> `ACTIVE`: **BLOCKED**. Archived tenants are read-only silos kept strictly for compliance (e-discovery, audit).

## RBAC Requirements
- **EMPLOYEE -> ARCHIVE TENANT:** **BLOCKED**. Only the Tenant Owner can initiate the deletion sequence. Employees have zero authority.
- **TENANT_ADMIN -> DELETE TENANT:** **BLOCKED**. Only the explicit `ownerId` on the `Tenant` row is authorized.
- **GLOBAL_ADMIN -> DELETE TENANT:** **ALLOWED** (Only for terms of service violations or abuse).

## Testing the State Machine
- Owner requests deletion -> Transitions to `DELETION_REQUESTED`.
- Employee attempts to use session -> 403 Forbidden (Blocked).
- System cron fires after 30 days -> Transitions to `ARCHIVED`.

**Verdict:** The proposed state machine securely covers enterprise retention compliance.
