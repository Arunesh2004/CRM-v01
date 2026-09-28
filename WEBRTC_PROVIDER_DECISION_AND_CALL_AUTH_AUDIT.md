# WebRTC Provider Decision and Call Auth Audit

## 1. Executive Summary
This report resolves two critical uncertainties preceding the WebRTC E2E milestone: the actual project requirement for a TURN provider, and the exact CRM roles/permissions required for the participants in a `CallSession`. Based on a strict inspection of the project's documentation and source code, we have determined that no TURN provider is mandated for the current milestone (signaling tests can proceed without media fallback), and calling authorization relies on generic RBAC permissions rather than hardcoded "Employee" roles. The production database migration status for `CallSession` remains unvalidated pending an authorized safe-read mechanism.

## 2. TURN Requirement Evidence
A comprehensive review of the project's requirements, specifically `Recent Updated - 02 Date _ 16th September 2026.docx`, yields the following evidence:
- **Exact Requirement**: Section 4.3 ("WebRTC/STUN Finding") and Section 10 state: *"If Pusher signaling succeeds but media cannot establish because there is no TURN or network traversal is restricted, the correct result is signaling PASS plus media BLOCKED/NOT TESTED—not a fabricated overall media PASS."*
- **Whether it is mandatory**: It is **not specified/optional** for the immediate milestone of proving signaling and basic WebRTC capabilities. The absence of TURN is recognized as a "real infrastructure limitation", meaning the test can proceed and accurately report media blockage rather than requiring TURN upfront.
- **Conclusion**: **No specific TURN provider is currently approved/documented.**

## 3. Current STUN/TURN/ICE Implementation
Inspection of `src/hooks/useWebRTCCall.ts`:
- **STUN servers**: Hardcoded fallback to `stun:stun.l.google.com:19302`.
- **TURN servers**: Absent.
- **ICE configuration**: Driven by the `iceServers` array passed into `UseWebRTCCallOptions`.
- **Credentials supported**: The current implementation does not accept or inject TURN credentials.
- **Environment-driven**: Partially. `iceServers` can be injected into the hook, but there are no environment variables currently mapped for TURN.
- **Relay-only/fallback**: No relay-only enforcement.
- **Direct/STUN connectivity**: Yes, calls technically attempt direct/STUN connectivity without TURN.

**Classifications:**
- STUN = CODE VERIFIED ONLY
- TURN = ABSENT
- ICE configuration = CODE VERIFIED ONLY
- Actual media connectivity = UNVALIDATED

## 4. Calling Authorization Analysis
Inspection of `/api/communication/call/signaling/route.ts`, `/api/realtime/auth/route.ts`, and `call.actions.ts`:
- **A. Who may initiate a call?**: Any authenticated user possessing the `COMMUNICATION` / `CREATE` permission.
- **B. Who may receive/accept a call?**: The user whose ID strictly matches the `recipientId` on the established `CallSession` record.
- **C. What permission is checked?**: `requirePermission(Resource.COMMUNICATION, Action.CREATE)` via `initiateCallAction`.
- **D. What role is required, if any?**: No specific named role (e.g., "Employee" or "Admin") is hardcoded. Any role bound to the requisite permissions is valid.
- **E. Does the implementation simply require authenticated users?**: No. Initiation requires explicit RBAC permissions. Signaling requires the authenticated user to be either the caller or recipient.
- **F. Does it require both users to belong to the same tenant?**: Yes. `CallSessionService.initiateCall` rigidly bounds the session to the caller's `tenantId`, and signaling validates `session.tenantId === tenantId`.
- **G. Does it require the caller/callee to be an employee?**: No. It only requires them to possess valid authenticated CRM identities mapped to the tenant.
- **H. Are Admin and Employee treated differently?**: Only if their assigned RBAC permissions differ.
- **I. What prevents a user from calling another tenant?**: The authoritative backend `tenantId` extraction (`requireTenant()`) enforces tenant boundaries during `CallSession` creation.
- **J. What prevents a user from forging another user's CallSession?**: The signaling route asserts that `user.id` (securely decoded from the session token) matches either `session.callerId` or `session.recipientId`.
- **K. What prevents unauthorized Pusher channel subscription?**: `/api/realtime/auth` cryptographically signs subscriptions. It rejects any request where the `channel_name` does not exactly match `private-tenant_${tenantId}_user_${user.id}`.

## 5. Required E2E Identity Configuration
The minimum valid setup for the eventual hosted E2E requires two distinct authenticated tenant users. The project requires two distinct users but does not require employee-specific roles, so long as the initiation permissions are met.

**CALLER:**
- **ROLE**: Any valid role.
- **PERMISSIONS**: `COMMUNICATION:CREATE` (Resource.COMMUNICATION, Action.CREATE).
- **TENANT**: Tenant A.

**CALLEE:**
- **ROLE**: Any valid role.
- **PERMISSIONS**: Standard CRM access to load the UI and connect to Pusher.
- **TENANT**: Tenant A.

## 6. CallSession Migration Verification Plan
Migration: `20260916000000_add_production_call_session`
- **Changes**: Defines the `CallSession` table, foreign keys to `Tenant` and `User`, and RLS policies.
- **Prisma Schema**: `schema.prisma` expects this model.
- **Application Runtime**: Required to generate the CallSession ID used for signaling.
- **Verification Method**: No safe read-only production verification method is currently authorized/documented in this phase to check migration status.
- **Status**: Production CallSession migration status remains UNVALIDATED.

## 7. Pusher Credential Contract
- **`PUSHER_APP_ID`**: Identifier for server-side API communication. Non-secret. Server-side only. Required.
- **`PUSHER_KEY`**: Public key for server-side API auth. Non-secret. Server-side only. Required.
- **`PUSHER_SECRET`**: Secret key for server-side signatures. Secret. Server-side only. Required.
- **`PUSHER_CLUSTER`**: Cluster region. Non-secret. Server-side only. Required.
- **`NEXT_PUBLIC_PUSHER_KEY`**: Client key for browser `pusher-js` connection. Non-secret. Client-side. Required.
- **`NEXT_PUBLIC_PUSHER_CLUSTER`**: Client cluster region. Non-secret. Client-side. Required.

*(Note: Production environment variables are currently MISSING/UNKNOWN based on the required safe boundary. Secrets will not be exposed.)*

## 8. Readiness Matrix

| Requirement | Evidence | Status | Blocking? |
|-------------|----------|--------|-----------|
| Pusher implementation | `pusher.provider.ts`, `useWebRTCCall.ts` | CODE VERIFIED ONLY | No |
| Pusher production credentials | Server/Client Env variables | UNVALIDATED | Yes |
| STUN | Hardcoded `stun.l.google.com:19302` | CODE VERIFIED ONLY | No |
| TURN requirement | Documented as infrastructure limitation, not failure | NOT APPLICABLE | No |
| TURN provider selection | No documented selection | NOT APPLICABLE | No |
| ICE configuration | `useWebRTCCall.ts` | CODE VERIFIED ONLY | No |
| CallSession schema | `schema.prisma` | CODE VERIFIED ONLY | No |
| CallSession production migration | No safe inspection authorized | UNVALIDATED | Yes |
| Calling authorization | `call.actions.ts`, signaling route | PASS | No |
| Tenant isolation | Realtime auth & CallSession creation | PASS | No |
| Two test identities | Requires explicit provisioning | UNVALIDATED | Yes |
| Hosted browser E2E | Pending provider configuration | BLOCKED | Yes |
| Actual media connectivity | Pending live test | UNVALIDATED | No |

## 9. Remaining Blockers
1. **Pusher Credentials**: The production environment lacks securely injected Pusher keys and secrets.
2. **CallSession Migration**: It is unknown if the migration is applied in production, and no safe read-only method is currently authorized to check it.
3. **Test Identities**: Two distinct users with `COMMUNICATION:CREATE` permissions must be provisioned in the same tenant.

## 10. Exact Next Action

**Answers to Final Decision Questions:**
1. Is a specific TURN provider already mandated/approved by project documentation? **No.**
2. Is TURN mandatory for the current milestone, or merely recommended for production reliability? **Not mandatory for the milestone; its absence will explicitly downgrade the result to "media BLOCKED/NOT TESTED".**
3. What exact role/permissions should the two E2E test users have? **They must both belong to the same tenant, have distinct identities, and the caller must possess `Resource.COMMUNICATION` / `Action.CREATE`.**
4. What is the safe method to verify CallSession migration state? **None is currently authorized.** Production CallSession migration status remains UNVALIDATED.
5. What exact prerequisites remain before hosted WebRTC E2E? **(1) Securely provisioning Pusher credentials. (2) Authorizing the CallSession migration verification/deployment. (3) Provisioning two test identities.**
6. What is the next authorized action? **Provide the Pusher credentials via the project's secure configuration mechanism (Vercel dashboard), authorize a method to verify/deploy the `CallSession` migration, and authorize the provisioning of two test users.**
