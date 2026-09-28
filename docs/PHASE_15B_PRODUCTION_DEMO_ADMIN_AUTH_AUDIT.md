# PHASE 15B — PRODUCTION DEMO ADMIN AUTH AUDIT

## 1. Actual demo architecture
The target architecture uses the **EXISTING Clerk Production Admin** to access the hosted CRM:
`Client -> https://crm-v01.vercel.app -> Clerk PRODUCTION -> existing Demo Admin identity -> CRM User -> Tenant -> Admin Role -> Permissions -> CRM Dashboard`
After Admin login, the Admin creates/invites Employees, who then establish their own Clerk credentials. Passwords are managed by Clerk, not the CRM Admin.

## 2. Existing Production Clerk Admin identity
- **Status**: PASS
- **Details**: The intended Demo Admin is the existing Production Clerk identity. The user exists, is active, and no destructive modifications (password resets/deletions) are needed or permitted.

## 3. Vercel project/deployment
- **Project**: `crm-v01`
- **Deployment URL**: `https://crm-v01.vercel.app`
- **Status**: PASS

## 4. Domain configuration
- **Status**: BLOCKED
- **Details**: A custom domain controlled by the operator is REQUIRED to use Clerk Production. It must be attached to the existing `crm-v01` Vercel project. No custom domain has been supplied by the operator yet.

## 5. Clerk Production configuration
- **Status**: BLOCKED
- **Details**: The Clerk Production instance requires a primary custom domain verified via DNS CNAME records. Because `*.vercel.app` restricts custom CNAME verification on shared suffixes, Clerk Production cannot operate on `crm-v01.vercel.app`.

## 6. Environment variables — safe metadata only
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Currently `pk_test_...` (Clerk Development). Must be restored to `pk_live_...`.
- `CLERK_SECRET_KEY`: Currently `sk_test_...` (Clerk Development). Must be restored to `sk_live_...`.
- `CRM_LOAD_TEST_AUTH_ENABLED`: Disabled.
- **Finding**: The Vercel Production environment is temporarily using Development keys.

## 7. Historical regression
- **Evidence**: Production Clerk was **never** functioning on the `crm-v01.vercel.app` hostname. The application successfully authenticated previously only because it was using Clerk Development (`pk_test_`) keys, which rely on third-party cookies. The infinite `/sign-in` redirect loop began exactly when `pk_live_` was introduced to the environment, as browsers enforce the Public Suffix List (PSL) and block first-party cookies on `*.vercel.app`.

## 8. CRM User identity mapping
- **Status**: BLOCKED
- **Details**: A mismatch exists. The seeded database `User` for the demo has a hardcoded `clerkId: 'demo-clerk'`. The existing Production Clerk Admin has a real `user_...` ID. `synchronizeClerkIdentity` will reject reassignment unless the database `clerkId` is first mutated to `null`.
- **Note**: No database mutation has been performed yet.

## 9. Tenant mapping
- **Status**: UNVALIDATED (Blocked by Auth/Mapping)

## 10. Admin role mapping
- **Status**: UNVALIDATED (Blocked by Auth)

## 11. Hosted authentication result
- **Status**: BLOCKED (Requires custom domain)

## 12. Logout result
- **Status**: BLOCKED

## 13. Admin UI results
- **Status**: BLOCKED

## 14. Employee creation/invitation result
- **Status**: BLOCKED

## 15. Employee authentication result
- **Status**: BLOCKED

## 16. Employee authorization result
- **Status**: BLOCKED

## 17. Security verification
- **Status**: PASS
- **Details**: Authentication architecture is preserved. No test auth bypasses introduced. No source code modified.

## 18. Production isolation
- **Status**: PASS
- **Details**: Production Clerk database and users remain completely untouched.

## 19. Remaining blockers
1. **Domain Blocker**: A custom domain (e.g., `demo.yourdomain.com`) must be provided by the operator and attached to Vercel `crm-v01` and the Clerk Production instance.
2. **Database Blocker**: The local CRM database must have `clerkId` set to `null` for the Demo Admin email to allow `synchronizeClerkIdentity` to map the Production Clerk `user_...` ID.

## 20. Exact next action
**STOP CONDITION REACHED.**
The operator must supply and configure a custom domain.
1. **Operator Action (Vercel/DNS)**: Add your custom domain to the `crm-v01` Vercel project and configure the required DNS A/CNAME records.
2. **Operator Action (Clerk)**: Add the custom domain to the Clerk Production instance and verify the DNS records.
3. **Operator Action (Database)**: Update the production database to prepare identity mapping: `UPDATE "User" SET "clerkId" = null WHERE email = 'demo@company.com';`
4. Provide the domain to the agent to continue Phase 7 (Environment Restoration).
