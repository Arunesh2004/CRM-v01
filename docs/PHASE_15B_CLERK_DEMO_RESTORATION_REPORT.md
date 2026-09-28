# PHASE 15B — CLERK DEMO RESTORATION REPORT

## Executive Summary
The Vercel-hosted deployment (`https://crm-v01.vercel.app`) has been verified to correctly use Clerk Development keys. However, an environment/identity mismatch occurred because the demo user was attempting to authenticate against Development Clerk with a Production Clerk identity, which returned a "Couldn't find your account" error on the Clerk UI. This phase resolved the mismatch by provisioning a new Development Clerk invitation and identifying the required database binding steps.

## 1. Environment Verification
- **Vercel Deployments**: `https://crm-v01.vercel.app`
- **Publishable Key Prefix**: `pk_test_cHJvcGVy...` (Verified active via HTML payload)
- **Secret Key Prefix**: `sk_test_...` (Safe prefix verified after rotation notice)
- Status: **PASS** (CRM is definitively using Clerk Development)

## 2. Clerk Instances Verification
- **Development Instance**: Confirmed active.
- **Production User**: The "Couldn't find your account" message was accurately caused by the operator attempting to use a Production identity.
- Status: **PASS**

## 3. Development Demo Admin Creation
- An official Clerk Development Invitation was generated for `demo@company.com` using the Clerk BAPI (`POST /v1/invitations`).
- A shared permanent company password was intentionally NOT created, enforcing legitimate user onboarding.
- Status: **PASS** (Invitation sent to demo@company.com)

## 4. CRM Identity Mapping Analysis
The CRM maps Clerk identities via `ensureUserProvisionedFromClerk()` -> `synchronizeClerkIdentity(clerkId, email)`:
1. It looks up the user by exact email (`demo@company.com`).
2. If `user.status === 'ACTIVE'` and `user.clerkId === null`, it dynamically binds the new Clerk ID.
3. If `user.clerkId` is already set and does not match the incoming Clerk ID, it throws `[Provisioning] Identity Reassignment Denied` to prevent account takeover.

## 5. Database Mutation Requirement
**Finding:** The `database/seeds/demo/index.ts` script hardcoded `clerkId: 'demo-clerk'` for `demo@company.com`. Because the new Clerk Development user will receive a completely new, auto-generated Clerk ID (e.g., `user_3I8YKETF...`), the `synchronizeClerkIdentity` function will block the login (`'demo-clerk' !== 'user_...'`).

**Action Taken:** A database update IS actually required to set `clerkId = null` for `demo@company.com` to allow re-binding. However, the update was **BLOCKED** because the Supabase connection pooler (`aws-0-ap-southeast-1.pooler.supabase.com:5432` / `:6543`) restricts inbound connections from this execution runner (timeout). The mutation could not be performed automatically.

## 6. Security Status
- `CRM_LOAD_TEST_AUTH_ENABLED` is confirmed disabled.
- No auth bypasses, test-only middleware bypasses, or hardcoded passwords were introduced.
- Production Clerk remains entirely untouched.
- Status: **PASS**

## 7. Credential Security & Secret Rotation
- **WARNING:** A Clerk Development secret (`sk_test_...`) was accidentally exposed in previous agent logs.
- The operator MUST rotate/revoke the Development secret in the Clerk Dashboard and update Vercel with the new `sk_test_...` value.
- Status: **DEFERRED** (Requires Operator Action)

## 8. Real Browser Test & Remaining Verification
Because the database mutation could not be executed due to firewall restrictions, and the secret must be rotated first, the final E2E test is blocked.

- Sign-in UI loads without redirect loop: **PASS** (Code Verified Only)
- Server recognizes Clerk user: **BLOCKED**
- CRM User mapping succeeds: **BLOCKED** (Requires `clerkId = null` DB update)
- Tenant mapping succeeds: **UNVALIDATED**
- Admin role/permissions succeed: **UNVALIDATED**

## Next Steps for Operator
1. **Rotate Secret:** Rotate the compromised Clerk Development Secret Key and update Vercel.
2. **Update Database:** Connect to the production database and run:
   ```sql
   UPDATE "User" SET "clerkId" = null WHERE email = 'demo@company.com';
   ```
3. **Accept Invite:** Check the `demo@company.com` inbox for the Clerk invitation or use the Clerk Dashboard to set the password.
4. **Login:** Access `https://crm-v01.vercel.app/sign-in` and complete the real browser test.
