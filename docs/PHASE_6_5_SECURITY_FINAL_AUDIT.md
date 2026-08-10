# PHASE 6.5 SECURITY FINAL AUDIT - CRITICAL VULNERABILITY DETECTED

## Vulnerability: Unauthenticated Restore Exploitation (RBAC Bypass)

### Description
During the Phase 6.5 Authorization Penetration tests, a critical Zero-Day vulnerability was discovered in the Disaster Recovery Engine. The system enforces strict Tenant Owner validation during the **Export** process (`export.engine.ts`), but it entirely lacks RBAC enforcement during the **Restore** process (`restore.engine.ts`).

### Attack Vector
Any authenticated user (`MEMBER`, `ADMIN`, or malicious insider) who obtains or guesses an `archiveLocation` (the S3 URI) can invoke `requestRestore()` and subsequently trigger the database pipeline, bypassing all tenant isolation barriers.

### Evidence
- `authPenetration.Member_Restore`: **FAIL** (Expected to block, but successfully triggered pipeline)
- `authPenetration.Admin_Restore`: **FAIL** (Expected to block, but successfully triggered pipeline)

### Code Inspection
In `src/modules/recovery/restore.engine.ts`:
```typescript
export async function requestRestore(archiveLocation: string, checksum: string, requestorUserId: string, mode: 'RECOVERY' | 'CLONE' | 'DRY_RUN' = 'DRY_RUN') {
  // 1. Create a REQUESTED job
  return await prismaAdmin.recoveryJob.create({
    data: {
      tenantId: 'pending',
      requestedBy: requestorUserId, // Saved but never validated!
...
```

The system never maps `archiveLocation` back to its origin `Tenant` to verify if `requestorUserId` == `tenant.ownerId` before allowing the restore to proceed.

---

## Proposed Remediation Plan
Before proceeding with the final certification, we must patch this vulnerability.

1. **Modify `requestRestore`**
   - Extract the `tenantIdToDownload` from the `archiveLocation` URI *immediately* during the request.
   - Query the `Tenant` model to verify ownership.
   - Enforce `tenant.ownerId === requestorUserId`. If false, throw `Forbidden`.
2. **Re-run the Chaos Audit Penetration Tests**
   - Confirm `MEMBER` and `ADMIN` roles are strictly blocked with `403` exceptions.

Awaiting approval to patch `restore.engine.ts` and resume the audit.
