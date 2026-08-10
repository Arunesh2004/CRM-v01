# PHASE 6.5.1 RESTORE AUTHORIZATION HARDENING REPORT

## Objective
Patch the Zero-Day RBAC bypass vulnerability identified in Phase 6.5, which allowed authenticated members to trigger restore actions without Tenant Ownership validation.

## Changes Implemented
- `RecoveryJob` schema was updated to explicitly bind to `RecoverySnapshot` (`snapshotId`).
- `requestRestore` in `restore.engine.ts` was rewritten to strictly validate authorization:
  1. Resolves actual `tenantId` strictly from the requested URI payload.
  2. Maps the request against a real `RecoverySnapshot` in the database to prevent arbitrary archive enumeration.
  3. Re-queries the active `Tenant` to cross-validate that the invoking `requestorUserId` matches `tenant.ownerId`.

## Penetration Testing Results
- ❌ **Before**: `MEMBER` and `ADMIN` users could arbitrarily submit valid/guessed URIs and trigger restorations, corrupting the production namespace.
- ✅ **After**:
  - `Member_Restore`: **PASS (BLOCKED)**
  - `Admin_Restore`: **PASS (BLOCKED)**
  - `Owner_Restore_Own_Tenant`: **PASS (ALLOWED)**
  - `Owner_CrossTenant_Restore`: **PASS (BLOCKED)**
  - `Fake_Archive_URI`: **PASS (BLOCKED)**
  - `Fake_Checksum`: **PASS (BLOCKED)**

## Verification
All 7 restore security boundaries have passed. Privilege escalation via recovery workflows is now completely mitigated.
