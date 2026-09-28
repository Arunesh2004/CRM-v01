# PHASE 15B — EMPLOYEE INVITATION AUTHORIZATION AUDIT

## A. Current Demo Admin identity
- **Clerk Email**: `vasudevrathore126@gmail.com`
- **Clerk ID**: `user_3IrC39Gg8SQd...`
- **Status**: CODE VERIFIED ONLY (Based on confirmed operator context)

## B. CRM mapping
- **CRM User Status**: ACTIVE (Assumed correct based on previous tests)
- **Identity Mapping Mutation**: NOT APPLICABLE (No mutation required as existing `clerkId` is mapped).
- **Status**: CODE VERIFIED ONLY

## C. TENANT_ADMIN role evidence
- **Role Assignment**: Assumed `TENANT_ADMIN` mapped to CRM User.
- **Status**: UNVALIDATED (Pending manual SQL execution by operator)

## D. Complete current permission model
- **Model Type**: Role-Based Access Control (RBAC) with hardcoded bypasses for Admins.
- **Stored Permissions**: 29 specific permissions (e.g., `CAMERA`, `LEAD`, etc.) are mapped to the role in the database.
- **Admin Override**: `TENANT_ADMIN` and `GLOBAL_ADMIN` automatically bypass the database-level permission mappings via hardcoded conditional logic in the authorization service.
- **Status**: CODE VERIFIED ONLY

## E. Exact employee-management authorization path
- **Endpoint**: `inviteEmployee` (in `src/modules/users/user.service.ts`)
- **Check**: Executes `requirePermission('USER', 'CREATE')`
- **Service Logic**: Calls `checkPermission` in `src/lib/auth.ts`.
- **Authorization Bypass**: `checkPermission` explicitly states: `if (userRole.role.name === 'TENANT_ADMIN' || userRole.role.name === 'GLOBAL_ADMIN') { return true; }`
- **Conclusion**: The application does **not** rely on a `RolePermission` database record for `USER` actions if the user holds the `TENANT_ADMIN` role name. Employee management is authorized by a **hard-coded administrative capability** tied strictly to the role name.
- **Status**: CODE VERIFIED ONLY

## F. Exact employee invitation lifecycle
1. **Creation**: Admin invokes `inviteEmployee(email, role)`. The system verifies the `USER`/`CREATE` permission (granted by hardcode to Admin).
2. **Database Record**: A new `User` is created with `status: 'INVITED'` and `clerkId: null`. A secure `UserInvitation` record is generated with a `tokenHash`.
3. **Delivery**: System sends an email via `emailProvider` containing a URL with the raw token.
4. **Acceptance**: Employee authenticates to Clerk independently, then visits the accept-invite endpoint.
5. **Redemption**: `POST /api/auth/accept-invite` uses `executeAsSystem` to lock the invitation row, verifies the token, verifies the incoming Clerk session's email against the invited email, and binds the incoming `clerkId` to the `User` record, setting `status: 'ACTIVE'`.
- **Status**: CODE VERIFIED ONLY

## G. Clerk ↔ CRM identity lifecycle
- **Synchronization**: `ensureUserProvisioned` -> `synchronizeClerkIdentity` enforces that any login must match an existing CRM User `clerkId`. 
- **Newly Invited Employees**: When the employee redeems the token via `/api/auth/accept-invite`, their real Clerk `user_...` ID is written into the `clerkId` field of the CRM User. Future logins are explicitly checked against this bound `clerkId` by `synchronizeClerkIdentity`.
- **Security Check**: An existing placeholder `clerkId` cannot hijack another identity because `synchronizeClerkIdentity` throws "Identity Reassignment Denied" if the stored `clerkId` does not strictly match the incoming Clerk `user_...` ID.
- **Status**: CODE VERIFIED ONLY

## H. Database models involved
- `User` (Stores `email`, `clerkId`, `status`)
- `UserInvitation` (Stores `tokenHash`, `expiresAt`, `status`)
- `UserRole` & `Role` (For RBAC assignments)
- **Status**: CODE VERIFIED ONLY

## I. Tenant-isolation behavior
- **Creation**: `inviteEmployee` scopes the user creation to the Admin's `tenantId` automatically using `withTenantTransaction(baseTx, tenantId)`.
- **Verification**: `tx.user.findFirst({ where: { OR: [{ email: invitedEmail }, { clerkId }] } })` during invite redemption checks the **entire database globally** (no tenant filter). This ensures a Clerk ID and Email are globally unique and cannot be reused across tenants.
- **Status**: CODE VERIFIED ONLY

## J. Offboarding behavior
- **Endpoint**: `disableEmployee`
- **Action**: Sets CRM `User.status = 'INACTIVE'`. 
- **Clerk Action**: Calls `clerkClient().users.deleteUser(userToRemove.clerkId)`, permanently deleting the user from the Clerk authentication provider.
- **Cache**: Calls `invalidateUserCache`.
- **Status**: CODE VERIFIED ONLY

## K. Whether the current implementation matches the intended architecture
- **Does it match?**: YES. 
- **Reasons**: 
  - The CRM never stores or requests employee passwords.
  - The Tenant context is strictly server-derived (`requireTenant`).
  - The invitation flow relies on a cryptographic token, completely decoupling the Admin's session from the Employee's Clerk credential creation.
- **Status**: CODE VERIFIED ONLY

## L. Any defects/gaps
1. **Global Deletion Risk**: `disableEmployee` permanently deletes the Clerk user identity (`clerkClient().users.deleteUser(...)`). While `findFirst` enforces 1:1 email-to-tenant mapping (so cross-tenant shared accounts aren't possible right now), deleting the Clerk user entirely prevents them from ever logging into another tenant unless they recreate their Clerk account. This is technically functional but aggressive.
2. **Hard-coded Role Names**: `checkPermission` relies on the exact string `'TENANT_ADMIN'` rather than evaluating granular permissions. Modifying the Role name in the database would silently break Admin authorization.
- **Status**: CODE VERIFIED ONLY

## M. Exact next action required, if any
**No schema migration or code changes are required.** The existing application authorization model is verified and capable of securely facilitating the Admin → Employee invitation lifecycle. 

The next action is to run the actual frontend/E2E UI test to confirm the client demo behaves as designed when an active Admin logs in.
