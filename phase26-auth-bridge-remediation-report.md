# PHASE 26D — MINIMAL PREVIEW AUTH-GATE FIX

## 1. Root Cause Analysis
The forensic investigation proved that Vercel Preview deployments use `NODE_ENV = 'production'`. Because our security gate historically checked `if (process.env.NODE_ENV === 'production') return false;`, the load-test auth bridge was perfectly disabling itself. When bypassed, requests fell back to Clerk's normal `auth.protect()`, which on Vercel Preview (without `NEXT_PUBLIC_CLERK_SIGN_IN_URL` explicitly passed for preview environments) throws a `404` via Next.js instead of a `307 Redirect`.

## 2. Remediation Implemented
I replaced the `NODE_ENV !== 'production'` check with a new internal helper:
```typescript
function isLoadTestAuthEnabled(): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return false;
  if (process.env.CRM_LOAD_TEST_AUTH_ENABLED !== 'true') return false;
  if (!process.env.LOAD_TEST_SECRET) return false;
  return true;
}
```
This is implemented symmetrically in both:
- `src/middleware.ts`
- `src/lib/auth.ts` (inside `tryLoadTestIdentity`)

## 3. Production Safety Guarantees (STATICALLY VERIFIED)
- In the real Vercel Production environment, `process.env.VERCEL_ENV === 'production'`. The new gate strictly requires `process.env.VERCEL_ENV === 'preview'`.
- Even if someone explicitly leaks and sets `CRM_LOAD_TEST_AUTH_ENABLED=true` and `LOAD_TEST_SECRET` in Production, the bridge will immediately return `false`/`null`, completely protecting the application.
- The JWT is cryptographically verified exactly as before. The tenant is resolved entirely from the database via the user record, preventing any token manipulation from manufacturing tenant access.

## 4. Local Verification Results
- `npx tsc --noEmit`: **STATICALLY VERIFIED**
- `npx prisma validate`: **STATICALLY VERIFIED**
- `npm run lint`: **STATICALLY VERIFIED**
- `npm run build`: **STATICALLY VERIFIED**

## 5. Clerk P2002 Race Finding
- **Finding**: A `P2002 Unique Constraint` error on `clerkId` occasionally appears in logs when a user signs up.
- **Root Cause**: The Clerk Webhook and Next.js `requireAuth` redirect execute `ensureUserProvisioned` simultaneously.
- **Handling**: Safe. The failing transaction (which throws P2002) means the user was successfully created by the concurrent transaction. When it falls back and fetches `getCurrentUser`, the user is successfully found in the DB. The error is swallowed correctly, causing no disruption to user experience or Phase 26 audit provisioning.

## 6. Runtime Authentication Results
*(Pending final execution by user on live deployment)*
- Authenticated Status: **UNVERIFIED (Awaiting run)**
- Negative Auth Status: **UNVERIFIED (Awaiting run)**
- Tenant Isolation Result: **UNVERIFIED (Awaiting run)**
- RBAC Result: **UNVERIFIED (Awaiting run)**

Phase 26E remains **BLOCKED** until the user confirms Step 2 returns 200 on the live Vercel Preview.
