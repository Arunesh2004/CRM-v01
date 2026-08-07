# PHASE 3: INCIDENT MANAGEMENT REMEDIATION PLAN

## 1. Executive Summary
This remediation plan directly addresses the structural, security, and data integrity vulnerabilities identified in the Phase 3 Enterprise Workflow Audit for the Incident Management module. The objective is to enforce tenant-isolation boundaries for incident assignment, introduce a robust soft-delete lifecycle to prevent infinite data bloat, and correct legacy seed state discrepancies. All fixes adhere to the Zero Hallucination Engineering Policy. No speculative features or unrelated refactors are included.

---

## 2. Bug Mapping Table

| Bug ID | Problem | Root Cause | Affected Layer | Fix Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-INC-003** | Cross-Tenant Incident Assignment Leakage | `assignIncident` does not query the user table to verify `tenantId` ownership before assignment. | Service Layer | Add a strict Prisma query (`user.findFirst`) verifying `assignedUserId` belongs to `tenantId` before initializing the update transaction. |
| **BUG-INC-004** | Missing Incident Delete Lifecycle | No `deletedAt` schema field exists; no UI/action/service delete scaffolding was implemented. | Schema, UI, Action, Service | Add `deletedAt DateTime?` to `Incident`. Filter lists by `deletedAt: null`. Implement `deleteIncident` end-to-end and trigger a timeline event. |
| **BUG-INC-001** | Resolved Incident State Mismatch | Demo seed script injects `RESOLVED` status without populating the `resolvedAt` timestamp. | Database Seed | Update `prisma/seed.ts` to assign `resolvedAt: new Date()` when initializing resolved incidents. |

---

## 3. Detailed File-Level Changes

### BUG-INC-003: Cross-Tenant Assignment
- **File**: `src/modules/incident/incident.service.ts`
- **Function**: `assignIncident`
- **Current Issue**: The update payload blindly trusts the incoming `assignedUserId` without validating it against the tenant boundary.
- **Proposed Change**:
  Insert pre-validation before the transaction block:
  ```typescript
  if (input.assignedUserId) {
    const user = await prisma.user.findFirst({ where: { id: input.assignedUserId, tenantId } });
    if (!user) throw new Error('Assigned user does not belong to this tenant.');
  }
  ```

### BUG-INC-004: Missing Incident Delete Lifecycle
- **File**: `database/schema.prisma`
- **Model**: `Incident`
- **Current Issue**: Model lacks soft-delete capabilities.
- **Proposed Change**: Add `deletedAt DateTime?`

- **File**: `src/modules/incident/incident.service.ts`
- **Function**: `getIncidents` & `getIncidentById`
- **Current Issue**: Queries fetch all records regardless of deletion state.
- **Proposed Change**: Add `where: { tenantId, deletedAt: null }`.

- **File**: `src/modules/incident/incident.service.ts`
- **Function**: `deleteIncident` (New)
- **Proposed Change**: Implement soft-deletion logic that updates `deletedAt: new Date()` and dispatches an `activityTimeline` event ("Deleted Incident").

- **File**: `src/modules/incident/actions/incident.actions.ts`
- **Function**: `deleteIncidentAction` (New)
- **Proposed Change**: Implement standard Zod validated server action delegating to the service.

- **File**: `src/components/incident/IncidentClientTable.tsx`
- **Function**: `IncidentClientTable`
- **Current Issue**: No UI delete control.
- **Proposed Change**: Add a `Delete` button alongside Investigate/Resolve that invokes `deleteIncidentAction` and refreshes the router.

### BUG-INC-001: Resolved Incident State Mismatch
- **File**: `database/seeds/demo/index.ts`
- **Function**: `main()` (Incident Seeding)
- **Current Issue**: The "Perimeter Breach" mock incident is set to `RESOLVED` but has no `resolvedAt` timestamp.
- **Proposed Change**: Add `resolvedAt: new Date()` to its data payload.

---

## 4. Database Migration Plan
- **Schema Changes**: Append `deletedAt DateTime?` to `model Incident`.
- **Data Migration**: None strictly required since `deletedAt` is optional. Pre-existing records will evaluate to `null` and remain visible.
- **Execution**: Run `npx prisma db push --accept-data-loss` (or safe equivalence) to synchronize the schema.
- **Rollback Considerations**: Since the field is optional, dropping the column reverts to the prior state without mutating core records.

---

## 5. Security Verification Plan
- **Cross Tenant Assignment (BUG-INC-003)**: Execute the standalone test script injecting a foreign `userId` payload. Ensure it aborts and throws the unauthorized error.
- **Unauthorized Updates**: Run the assignment with standard credentials to verify the standard path isn't inadvertently blocked.
- **Deleted Record Visibility (BUG-INC-004)**: Verify soft-deleted incidents are definitively hidden from `getIncidents()` outputs but retained cleanly at the database schema level.

---

## 6. Runtime Verification Plan
A dedicated test script (`scripts/verify_incident_remediation.ts`) will be written to execute the following end-to-end trace:
1. Create mock AI event and incident.
2. Ensure assignment to current tenant succeeds.
3. Attempt assignment to foreign tenant user -> Expect Rejection.
4. Update status to `RESOLVED` -> Expect `resolvedAt` to populate.
5. Soft Delete incident -> Expect `deletedAt` to populate.
6. Query incidents list -> Expect the deleted incident to be excluded.

---

## 7. Build Validation Plan
Execute `npm run build` post-remediation to assert zero compiler regressions, specifically verifying that the new `deleteIncident` UI logic propagates seamlessly into the production Next.js turbopack bundles.
